import { Command, Env } from "./lib/command.js";
import { stdout, stderr } from "process";
import { getDevice } from "./util.js";

import { version } from "../project/version.js";

const cmd = new Command("Get version of device firmware", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const ble = options["ble"] as string | undefined;

        stdout.write("Jaculus-tools version:\n  " + version + "\n\n");

        const device = await getDevice(port, baudrate, socket, ble, env);

        const status = await device.controller.version().catch((err) => {
            stderr.write("Error: " + err + "\n");
            throw 1;
        });

        stdout.write("Firmware version:\n  " + status.join("\n  ") + "\n");
    },
    chainable: true
});

export default cmd;
