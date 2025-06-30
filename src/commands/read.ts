import { Arg, Command, Env } from "./lib/command.js";
import { stdout, stderr } from "process";
import { getDevice } from "./util.js";


const cmd = new Command("Read a file from device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const ble = options["ble"] as string | undefined;
        const path = args["path"] as string;

        const device = await getDevice(port, baudrate, socket, ble, env);

        await device.controller.lock().catch((err) => {
            stderr.write("Error locking device: " + err + "\n");
            throw 1;
        });

        const data = await device.uploader.readFile(path).catch((err) => {
            stderr.write("Error: " + err + "\n");
            throw 1;
        });

        await device.controller.unlock().catch((err) => {
            stderr.write("Error unlocking device: " + err + "\n");
            throw 1;
        });

        stdout.write(data);
    },
    args: [
        new Arg("path", "File to read", { required: true }),
    ],
    chainable: true
});

export default cmd;
