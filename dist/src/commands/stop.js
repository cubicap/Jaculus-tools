import { Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
let cmd = new Command("Stop a program", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        await withDevice(port, baudrate, socket, async (device) => {
            let cmd = await device.controller.stop().catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });
            stdout.write(cmd.toString() + "\n");
        });
    }
});
export default cmd;
//# sourceMappingURL=stop.js.map