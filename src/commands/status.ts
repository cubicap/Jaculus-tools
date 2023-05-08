import { Command, Env } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";


const cmd = new Command("Get status of device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;

        const device = await getDevice(port, baudrate, socket, env);

        const status = await device.controller.status().catch((err) => {
            stdout.write("Error: " + err + "\n");
            throw 1;
        });

        stdout.write("Running: " + status.running + "\n");
        if (!status.running) {
            stdout.write("Last exit code: " + status.exitCode + "\n");
        }
        stdout.write(status.status + "\n");
    },
    chainable: true
});

export default cmd;
