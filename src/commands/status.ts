import { Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";


let cmd = new Command("Get status of device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let path = args["path"] as string;

        await withDevice(port, baudrate, socket, async (device) => {
            let status = await device.controller.status().catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });

            stdout.write("Running: " + status.running + "\n");
            if (!status.running) {
                stdout.write("Last exit code: " + status.exitCode + "\n");
            }
            stdout.write(status.status + "\n");
        });
    }
});

export default cmd;
