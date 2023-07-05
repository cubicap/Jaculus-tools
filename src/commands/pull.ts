import { Arg, Command, Env } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";


const cmd = new Command("Download a file/directory from device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const local = args["local"] as string;
        const remote = args["remote"] as string;

        const device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            throw 1;
        });

        const cmd = await device.uploader.pull(remote, local).catch((err) => {
            stdout.write("Error: " + err + "\n");
            throw 1;
        });

        await device.controller.unlock().catch((err) => {
            stdout.write("Error unlocking device: " + err);
            throw 1;
        });

        stdout.write(cmd.toString() + "\n");
    },
    args: [
        new Arg("remote", "Remote file to download", { required: true }),
        new Arg("local", "File to download to", { required: true }),
    ],
    chainable: true
});

export default cmd;
