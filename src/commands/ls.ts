import { Arg, Command, Env } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";
import chalk from "chalk";


let cmd = new Command("List files in a directory", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let path = args["path"] as string;

        let device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            process.exit(1);
        });

        let listing = await device.uploader.listDirectory(path).catch((err) => {
            stdout.write("Error: " + err + "\n");
            process.exit(1);
        });

        stdout.write("Listing of " + path + ":\n");
        for (let [name, isDir] of listing) {
            stdout.write("  " + (isDir ? chalk.blueBright(name) : name) + "\n");
        }

        await device.controller.unlock().catch((err) => {
            stdout.write("Error unlocking device: " + err);
            process.exit(1);
        });
    },
    args: [
        new Arg("path", "Directory to list", { required: true }),
    ],
    chainable: true
});

export default cmd;
