import { Arg, Command, Env, Opt } from "./lib/command.js";
import { stdout } from "process";
import { getDevice, withDevice } from "./util.js";
import { logger } from "../util/logger.js";


let cmd = new Command("Flash a directory to device (replace contents of /data)", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let from = options["from"] as string;

        let device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            process.exit(1);
        });

        await device.controller.stop().catch((err) => {
            logger.verbose("Error stopping device: " + err);
        });

        await device.uploader.deleteDirectory("/data");

        let cmd = await device.uploader.push(from, "/data").catch((err) => {
            stdout.write("Error uploading: " + err + "\n");
            process.exit(1);
        });
        stdout.write(cmd.toString() + "\n");

        await device.controller.start("/data/index.js").catch((err) => {
            stdout.write("Error starting program: " + err + "\n");
            process.exit(1);
        });

        await device.controller.unlock().catch((err) => {
            stdout.write("Error unlocking device: " + err);
            process.exit(1);
        });
    },
    options: {
        "from": new Opt("Directory to flash", { required: true, defaultValue: "build" }),
    },
    chainable: true
});

export default cmd;
