import { Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
let cmd = new Command("Get status of device", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        let path = args["path"];
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
//# sourceMappingURL=status.js.map