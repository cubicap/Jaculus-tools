import { Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
let cmd = new Command("Monitor program output", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        await withDevice(port, baudrate, socket, async (device) => {
            device.programOutput.onData((data) => {
                stdout.write(data);
            });
            return new Promise((resolve, reject) => { });
        });
    }
});
export default cmd;
//# sourceMappingURL=monitor.js.map