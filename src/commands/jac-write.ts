import { Command, OptionValues } from "commander";
import { getDevice } from "./util.js";
import * as readline from "readline"

const program = new Command();
const stdout = process.stdout;

program
    .option("-p, --port [path]", "Serial port to use")
    .option("-b, --baudrate [baudrate]", "Baudrate to use", "921600")
    .option("-s, --socket [port]", "host:port to listen on")
    .argument("<path>", "File to write");


program.action(async (path: string, options: OptionValues) => {
    let device = await getDevice(options.port, options.baudrate, options.socket);

    let str = ""
    await new Promise((resolve, reject) => {
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on("line", (line: string) => {
            if (line == "\\") {
                rl.close();
                resolve(null);
            return;
            }
            str += line + "\n";
        });
    });

    device.uploader.writeFile(path, Buffer.from(str, "utf-8")).then((cmd) => {
        stdout.write(cmd + "\n");
        process.exit(0);
    }
    ).catch((err) => {
        stdout.write("Error: " + err + "\n");
        process.exit(1);
    });
});

program.parse(process.argv);
