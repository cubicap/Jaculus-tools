import { Command, Env, Opt } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";


let cmd = new Command("Start a program", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let entry = options["entry"] as string;

        let device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            process.exit(1);
        });

        let cmd = await device.controller.start(entry).catch((err) => {
            stdout.write("Error: " + err + "\n");
            process.exit(1);
        });

        await device.controller.unlock().catch((err) => {
            stdout.write("Error unlocking device: " + err);
            process.exit(1);
        });

        stdout.write(cmd.toString() + "\n");
    },
    options: {
        "entry": new Opt("Remote file to run", { defaultValue: "./code/index.js", required: true }),
    },
    chainable: true
});

export default cmd;
