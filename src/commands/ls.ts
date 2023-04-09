import { Arg, Command, Env, Opt } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";
import chalk from "chalk";


let cmd = new Command("List files in a directory", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let path = args["path"] as string;
        let directoryFlag = options["directory"] as boolean;
        let sizeFlag = options["size"] as boolean;

        let flags = (directoryFlag ? "d" : "") + (sizeFlag ? "s" : "");

        let device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            process.exit(1);
        });

        let listing = await device.uploader.listDirectory(path, flags).catch((err) => {
            stdout.write("Error: " + err + "\n");
            process.exit(1);
        });

        stdout.write("Listing of " + path + ":\n");
        for (let [name, isDir, size] of listing) {
            stdout.write("  " + (isDir ? chalk.blueBright(name) : name) + (sizeFlag ? " (" + size + " bytes)" : "") + "\n");
        }

        await device.controller.unlock().catch((err) => {
            stdout.write("Error unlocking device: " + err);
            process.exit(1);
        });
    },
    args: [
        new Arg("path", "Directory to list", { required: true }),
    ],
    options: {
        "directory": new Opt("list directories themselves, not their contents", { isFlag: true }),
        "size": new Opt("print the allocated size of each file, in bytes", { isFlag: true })
    },
    chainable: true
});

export default cmd;
