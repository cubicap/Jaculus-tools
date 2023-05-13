import { Command, Env, Opt } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";
import { logger } from "../util/logger.js";


const cmd = new Command("Flash code to device (replace contents of ./code)", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const from = options["from"] as string;

        const device = await getDevice(port, baudrate, socket, env);

        await device.controller.lock().catch((err) => {
            stdout.write("Error locking device: " + err);
            throw 1;
        });

        await device.controller.stop().catch((err) => {
            logger.verbose("Error stopping device: " + err);
        });

        logger.info("Deleting old code");
        await device.uploader.deleteDirectory("code").catch((err) => {
            logger.verbose("Error deleting directory: " + err);
        });

        const cmd = await device.uploader.upload(from, "code").catch((err) => {
            stdout.write("Error uploading: " + err + "\n");
            throw 1;
        });
        stdout.write(cmd.toString() + "\n");

        await device.controller.start("index.js").catch((err) => {
            stdout.write("Error starting program: " + err + "\n");
            throw 1;
        });

        await device.controller.unlock().catch((err) => {
            stdout.write("Error unlocking device: " + err);
            throw 1;
        });
    },
    options: {
        "from": new Opt("Directory to flash", { required: true, defaultValue: "build" }),
    },
    chainable: true
});

export default cmd;
