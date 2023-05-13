import { Command, Opt } from "./lib/command.js";
import path from "path";
import fs from "fs";
import https from "https";
import unzipper from "unzipper";
import { logger } from "../util/logger.js";
import cliProgress from "cli-progress";
import { stdout, stderr } from "process";
import child_process from "child_process";
import chalk from "chalk";
import os from "os";


const platforms = ["esp32", "esp32s3"];


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
                const url = res.headers.location;
                logger.verbose("Redirecting to " + url);
                if (!url) {
                    reject("No redirect URL");
                    return;
                }
                downloadAndExtract(url, target)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            if (res.statusCode != 200) {
                reject("HTTP error " + res.statusCode);
                return;
            }

            const totalSize = res.headers["content-length"] ? parseInt(res.headers["content-length"]) : undefined;

            let bar: cliProgress.SingleBar | undefined;

            if (totalSize) {
                const [div, unit] = getSizeUnit(totalSize);

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
                    etaBuffer: 3000,
                }, cliProgress.Presets.legacy);

                bar.start(totalSize, 0);
            }


            const extract = unzipper.Extract({ path: target });

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

function getJaculusDataDir(): string {
    const homeDir = os.homedir();
    const jaculusDir = path.join(homeDir, ".jaculus");
    if (!fs.existsSync(jaculusDir)) {
        fs.mkdirSync(jaculusDir);
    }
    return jaculusDir;
}

function getIdfPath(def: string, path_?: string): string {
    if (!path_ || ["download", "force-download", "force-init"].includes(path_)) {
        return path.resolve(path.join(getJaculusDataDir(), def));
    }
    return path.resolve(path_);
}

async function installUpstream(port: string, platform: string, idf: string, upstream: string): Promise<void> {
    if (!idf) {
        stderr.write(chalk.red("No IDF path specified\n"));
        throw 1;
    }

    const idfVersion = "esp-idf-v5.0.1";

    const idfPath = getIdfPath(idfVersion, idf);
    const idfUrl = "https://github.com/espressif/esp-idf/releases/download/v5.0.1/" + idfVersion + ".zip";

    const jacDir = "Jaculus-esp32-master";
    const jacUrl = "https://github.com/cubicap/Jaculus-esp32/archive/refs/heads/master.zip";

    if (!port) {
        stderr.write(chalk.red("No port specified\n"));
        throw 1;
    }
    if (!platform) {
        stderr.write(chalk.red("No platform specified\n"));
        throw 1;
    }
    if (!platforms.includes(platform)) {
        stderr.write(chalk.red("Invalid platform specified: " + platform + "\n"));
        throw 1;
    }

    if (idf == "force-download") {
        stdout.write(chalk.green("Removing existing ESP-IDF in " + idfPath + "\n"));
        fs.rmSync(idfPath, { recursive: true, force: true });
    }

    // ----- INSTALL ESP-IDF -----
    let downloaded = false;
    if (["download", "force-download"].includes(idf) && !fs.existsSync(idfPath)) {
        const target = path.dirname(idfPath);

        // download
        stdout.write(chalk.green("\nDownloading ESP-IDF to " + target + " (from " + idfUrl + ")\n"));
        await downloadAndExtract(idfUrl, target)
            .catch((err) => {
            // TODO: remove downloaded file
                stderr.write(chalk.red("Error downloading ESP-IDF: " + err + "\n"));
                throw 1;
            });

        stdout.write("ESP-IDF downloaded");
        downloaded = true;
    }

    if (downloaded || idf == "force-init") {
        fs.chmodSync(path.join(idfPath, "install.sh"), 0o755);
        fs.chmodSync(path.join(idfPath, "install.bat"), 0o755);

        fs.chmodSync(path.join(idfPath, "export.sh"), 0o755);
        fs.chmodSync(path.join(idfPath, "export.bat"), 0o755);

        fs.chmodSync(path.join(idfPath, "tools", "idf.py"), 0o755);

        // run install script
        let installScript: string;
        if (process.platform == "win32") {
            installScript = path.join(idfPath, "install.bat");
        }
        else {
            installScript = path.join(idfPath, "install.sh");
        }

        stdout.write(chalk.green("\nRunning ESP-IDF install script\n"));
        try {
            child_process.execSync(installScript, {
                stdio: "inherit",
                cwd: idfPath
            });
        }
        catch (err) {
            stderr.write(chalk.red("Error running ESP-IDF install script: " + err + "\n"));
            stderr.write(chalk.red("Please check ESP-IDF error message and try again with --idf=force-init\n"));
            stderr.write(chalk.red("If the problem persists, you can try redownloading ESP-IDF with --idf=force-download or running the install script manually\n"));
            throw 1;
        }
    }

    if (!fs.existsSync(idfPath)) {
        stderr.write(chalk.red("ESP-IDF not found at " + idfPath + "\n"));
        stderr.write(chalk.red("Check that the path is correct or download ESP-IDF with --idf=download\n"));
        throw 1;
    }

    // ----- DOWNLOAD JACULUS -----
    const jacPath = path.join(getJaculusDataDir(), jacDir);

    if (upstream == "force" && fs.existsSync(jacPath)) {
        fs.rmSync(jacPath, { recursive: true, force: true });
    }

    if (!fs.existsSync(jacPath)) {
        stdout.write(chalk.green("\nDownloading Jaculus from " + jacUrl + "\n"));

        await downloadAndExtract(jacUrl, getJaculusDataDir())
            .catch((err) => {
            // TODO: remove downloaded files
                stderr.write(chalk.red("Error downloading Jaculus: " + err + "\n"));
                throw 1;
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
        throw 1;
    }

    // ----- BUILD AND FLASH JACULUS -----
    const idfCommand = "idf.py -p " + port + " build flash";

    let command: string;
    if (process.platform == "win32") {
        command = `${path.join(idfPath, "export.bat")} && ${idfCommand}`;
    }
    else {
        command = `bash -c "source ${path.join(idfPath, "export.sh")} && ${idfCommand}"`;
    }

    stdout.write(chalk.green("\nRunning build and flash\n\n"));
    try {
        child_process.execSync(command, {
            stdio: "inherit",
            cwd: jacPath
        });
    }
    catch (err) {
        stderr.write(chalk.red("Error running ESP-IDF: " + err + "\n"));
        stderr.write(chalk.red("Please check the ESP-IDF error message\n"));
        stderr.write(chalk.red("Also check that the port is correct, the device is connected, device driver is installed and you have sufficient permissions\n"));
        stderr.write(chalk.red("You can reinitialize ESP-IDF with --idf=force-init or try redownloading it with --idf=force-download\n"));
        stderr.write(chalk.red("You can also try redownloading Jaculus with --upstream=force to fix any build errors\n"));
        throw 1;
    }
}

async function installJaculusBinary(port: string, platform: string): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // chage default values of upstream and idf

    stderr.write("Binary distribution is not implemented");
    throw 1;
}


const cmd = new Command("Install Jaculus to device", {
    action: async (options: Record<string, string | boolean>) => {
        const platform = options["platform"] as string;
        const port = options["port"] as string;

        const upstream = options["upstream"] as string;

        if (["yes", "force"].includes(upstream)) {
            const idf = options["idf"] as string;
            await installUpstream(port, platform, idf, upstream);
        }
        else {
            await installJaculusBinary(port, platform);
        }

        stdout.write(chalk.green("\nJaculus flashed successfully!\n"));
    },
    options: {
        "platform": new Opt("Target platform for [" + platforms.join(", ") + "]"),
        "upstream": new Opt("Install Jaculus from upstream (requires idf to be set), [no, yes, force]", { defaultValue: "yes" }),
        "idf": new Opt("Path to ESP-IDF >=5.0.1 [<path>, download, force-dl, force-init]", { defaultValue: "download" }),
    },
    description: "Requires Python, git and device driver to be installed.\nIf --idf=download, it will be automatically downloaded and installed.\n"
});

export default cmd;
