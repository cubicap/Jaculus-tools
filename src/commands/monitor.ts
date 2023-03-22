import { Command, Env } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";


let cmd = new Command("Monitor program output", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;

        let device = await getDevice(port, baudrate, socket, env);

        device.programOutput.onData((data) => {
            stdout.write(data);
        });

        return new Promise((resolve, reject) => {});
    },
    chainable: true
});

export default cmd;
