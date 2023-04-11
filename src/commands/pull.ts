import { Arg, Command, Env } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";


let cmd = new Command("Upload a file/directory to device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let local = args["local"] as string;
        let remote = args["remote"] as string;

        let device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            process.exit(1);
        });

        let cmd = await device.uploader.pull(remote, local).catch((err) => {
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
        new Arg("remote", "Remote file to upload to", { required: true }),
        new Arg("local", "File to upload", { required: true }),
    ],
    chainable: true
});

export default cmd;