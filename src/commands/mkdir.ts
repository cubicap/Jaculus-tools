import { Arg, Command, Env } from "./lib/command.js";
import { stdout, stderr } from "process";
import { getDevice } from "./util.js";


const cmd = new Command("Create a directory on device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const path = args["path"] as string;

        const device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stderr.write("Error locking device: " + err + "\n");
            throw 1;
        });

        const cmd = await device.uploader.createDirectory(path).catch((err) => {
            stderr.write("Error: " + err + "\n");
            throw 1;
        });

        await device.controller.unlock().catch((err) => {
            stderr.write("Error unlocking device: " + err + "\n");
            throw 1;
        });

        stdout.write(cmd.toString() + "\n");
    },
    args: [
        new Arg("path", "Directory to create", { required: true }),
    ],
    chainable: true
});

export default cmd;
