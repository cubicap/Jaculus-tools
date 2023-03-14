import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
let cmd = new Command("Flash a directory to device (replace contents of /data)", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        let from = args["from"];
        await withDevice(port, baudrate, socket, async (device) => {
            await device.uploader.deleteDirectory("/data");
            let cmd = await device.uploader.push(from, "/data").catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });
            stdout.write(cmd.toString() + "\n");
        });
    },
    args: [
        new Arg("from", "Directory to flash", { required: true }),
    ]
});
export default cmd;
//# sourceMappingURL=flash.js.map