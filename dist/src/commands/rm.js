import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
let cmd = new Command("Delete a file on device", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        let path = args["path"];
        await withDevice(port, baudrate, socket, async (device) => {
            let cmd = await device.uploader.deleteFile(path).catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });
            stdout.write(cmd.toString() + "\n");
        });
    },
    args: [
        new Arg("path", "File to delete", { required: true }),
    ]
});
export default cmd;
//# sourceMappingURL=rm.js.map