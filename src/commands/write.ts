import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";
import * as readline from "readline"


let cmd = new Command("Write a file to device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let path = args["path"] as string;

        let device = await getDevice(port, baudrate, socket);

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

        let cmd = await device.uploader.writeFile(path, Buffer.from(str, "utf-8")).catch((err) => {
            stdout.write("Error: " + err + "\n");
            process.exit(1);
        });

        stdout.write(cmd.toString() + "\n");

    },
    args: [
        new Arg("path", "File to write", { required: true }),
    ]
});

export default cmd;
