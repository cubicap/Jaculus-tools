import { Arg, Command, Env } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";
import * as readline from "readline"


let cmd = new Command("Write a file to device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let path = args["path"] as string;

        let device = await getDevice(port, baudrate, socket, env);

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

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            process.exit(1);
        });

        let cmd = await device.uploader.writeFile(path, Buffer.from(str, "utf-8")).catch((err) => {
            stdout.write("Error: " + err + "\n");
            process.exit(1);
        });

        await device.controller.unlock().catch((err) => {
            stdout.write("Error unlocking device: " + err);
            process.exit(1);
        });

        stdout.write(cmd.toString() + "\n");
    },
    args: [
        new Arg("path", "File to write", { required: true }),
    ],
    chainable: true
});

export default cmd;
