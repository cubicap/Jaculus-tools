import { Command, Opt } from "./lib/command.js";
import path from "path";
import * as fs from "fs";
import * as https from "https"
import * as unzipper from "unzipper";
import { logger } from "../util/logger.js";
import * as cliProgress from "cli-progress";
import { stdout, stderr } from "process";
import * as child_process from "child_process";
import chalk from "chalk"

const platforms = ["esp32", "esp32s3"];


const idfVersion = "esp-idf-v5.0.1";

const idfDir = idfVersion;
const idfUrl = "https://github.com/espressif/esp-idf/releases/download/v5.0.1/" + idfVersion + ".zip";

const jacDir = "Jaculus-master";
const jacUrl = "https://github.com/cubicap/Jaculus/archive/refs/heads/master.zip";


function getSizeUnit(size: number): [number, string] {
    if (size < 1024) {
        return [1, "B"];
    }
    if (size < 1024 * 1024) {
        return [1024, "KB"];
    }
    if (size < 1024 * 1024 * 1024) {
        return [1024 * 1024, "MB"];
    }
    return [1024 * 1024 * 1024, "GB"];
}

function downloadAndExtract(url: string, target: string): Promise<void> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode == 302) {
                let url = res.headers.location;
                logger.verbose("Redirecting to " + url);
                downloadAndExtract(url!, target)
                .then(resolve)
                .catch(reject);
                return;
            }

            let totalSize = res.headers["content-length"] ? parseInt(res.headers["content-length"]) : undefined;


            let bar: cliProgress.SingleBar | undefined;

            if (totalSize) {
                let [div, unit] = getSizeUnit(totalSize);

                bar = new cliProgress.SingleBar({
                    progressCalculationRelative: true,
                    formatValue: (value, options, type) => {
                        if (type == "value") {
                            return (value / div).toFixed(2) + " ";
                        }
                        if (type == "total") {
                            return " " + (value / div).toFixed(2) + " " + unit;
                        }
                        return value.toString();
                    },
                    format: "{bar} {percentage}% | {value}/{total} | {eta_formatted}",
                    etaBuffer: 1000,
                }, cliProgress.Presets.legacy);

                bar.start(totalSize, 0);
            }


            let extract = unzipper.Extract({ path: target });

            res.on("data", (chunk) => {
                if (bar) {
                    bar.increment(chunk.length);
                }
                extract.write(chunk);
            });
            extract.on("finish", () => {
                if (bar) {
                    bar.stop();
                }
                extract.end();
                resolve();
            });
            res.on("error", (err) => {
                if (bar) {
                    bar.stop();
                }
                reject(err);
            });
        });
    });
}

function getDownloadsDir(): string {
    return path.resolve(path.join(path.dirname(import.meta.url.replace("file:///", "")), "..", "..", "..", "download"));
}

function getIdfPath(path_?: string): string {
    if (!path_ || ["download", "force-download"].includes(path_)) {
        return path.resolve(path.join(getDownloadsDir(), idfDir));
    }
    return path.resolve(path_);
}


let cmd = new Command("Install Jaculus to device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let platform = options["platform"] as string;
        let port = options["port"] as string;
        let idf = options["idf"] as string;
        let forceDownload = options["force-download"] as boolean;

        if (!port) {
            stderr.write(chalk.red("No port specified\n"));
            process.exit(1);
        }
        if (!platform) {
            stderr.write(chalk.red("No platform specified\n"));
            process.exit(1);
        }
        if (!platforms.includes(platform)) {
            stderr.write(chalk.red("Invalid platform specified: " + platform + "\n"));
            process.exit(1);
        }

        if (idf == "force-download") {
            stdout.write(chalk.green("Removing existing ESP-IDF\n"));
            fs.rmSync(getIdfPath(), { recursive: true, force: true });
        }

        // ----- INSTALL ESP-IDF -----
        let idfPath = getIdfPath(idf);

        if (["download", "force-download"].includes(idf) && !fs.existsSync(idfPath)) {
            let target = path.dirname(getIdfPath());

            stdout.write(chalk.green("\nDownloading ESP-IDF from " + idfUrl + "\n"));
            await downloadAndExtract(idfUrl, target)
            .catch((err) => {
                stderr.write(chalk.red("Error downloading ESP-IDF: " + err + "\n"));
                process.exit(1);
            });

            stdout.write("ESP-IDF downloaded to " + getIdfPath() + "\n");


            let installScript: string;
            if (process.platform == "win32") {
                installScript = path.join(getIdfPath(), "install.bat");
            }
            else {
                installScript = path.join(getIdfPath(), "install.sh");
            }

            stdout.write(chalk.green("\nRunning ESP-IDF install script\n"));
            try {
                child_process.execSync(installScript, {
                    stdio: "inherit",
                    cwd: getIdfPath()
                });
            }
            catch (err) {
                stderr.write(chalk.red("Error running ESP-IDF install script: " + err + "\n"));
                stderr.write(chalk.red("You can try redownloading ESP-IDF with --idf=force-download or running the install script manually\n"));
                process.exit(1);
            }
        }

        if (!fs.existsSync(idfPath)) {
            stderr.write(chalk.red("ESP-IDF not found at " + idfPath + "\n"));
            stderr.write(chalk.red("Check that the path is correct or download ESP-IDF with --idf=download\n"));
            process.exit(1);
        }

        // ----- DOWNLOAD JACULUS -----
        let jacPath = path.join(getDownloadsDir(), jacDir);

        if (forceDownload && fs.existsSync(jacPath)) {
            fs.rmSync(jacPath, { recursive: true, force: true });
        }

        if (!fs.existsSync(jacPath)) {
            stdout.write(chalk.green("\nDownloading Jaculus from " + jacUrl + "\n"));

            await downloadAndExtract(jacUrl, getDownloadsDir())
            .catch((err) => {
                stderr.write(chalk.red("Error downloading Jaculus: " + err + "\n"));
                process.exit(1);
            });
        }

        // ----- CONFIGURE JACULUS -----
        stdout.write(chalk.green("\nConfiguring Jaculus for " + platform + "\n"));

        try {
            fs.rmSync(path.join(jacPath, "sdkconfig"), { force: true });
        }
        catch (err) {
            // Ignore
        }

        try {
            fs.copyFileSync(path.join(jacPath, "sdkconfig-" + platform), path.join(jacPath, "sdkconfig"));
        }
        catch (err) {
            stderr.write(chalk.red("Error copying selected configuration: " + err + "\n"));
            stderr.write(chalk.red("Try running with --force-download to redownload Jaculus\n"));
            process.exit(1);
        }

        // ----- BUILD AND FLASH JACULUS -----
        let idfCommand = "idf.py -p " + port + " build flash";

        let exportFile: string;
        if (process.platform == "win32") {
            exportFile = "export.bat";
        }
        else {
            exportFile = "export.sh";
        }

        stdout.write(chalk.green("\nRunning build and flash\n\n"));
        try {
            child_process.execSync(path.join(idfPath, exportFile) + " && " + idfCommand, {
                stdio: "inherit",
                cwd: jacPath
            });
        }
        catch (err) {
            stderr.write(chalk.red("Error running ESP-IDF: " + err + "\n"));
            stderr.write(chalk.red("Check that the port is correct and that the device is connected\n"));
            stderr.write(chalk.red("You can try redownloading Jaculus with --force-download to fix any build errors\n"));
            stderr.write(chalk.red("You can also try redownloading ESP-IDF with --idf=force-download\n"));
            process.exit(1);
        }

        stdout.write(chalk.green("\nJaculus flashed successfully!\n"));
    },
    options: {
        "idf": new Opt("Path to ESP-IDF 5.0 [<path>, download, force-download]", { defaultValue: "download" }),
        "platform": new Opt("Platform to build for [" + platforms.join(", ") + "]", { defaultValue: "esp32" }),
        "force-download": new Opt("Force redownload of Jaculus", { isFlag: true }),
    },
    description: "Requires Python, git and device driver to be installed.\nIf --idf=download, it will be automatically downloaded and setup.\n"
});

export default cmd;
