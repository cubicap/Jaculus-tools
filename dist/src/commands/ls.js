import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
let cmd = new Command("List files in a directory", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        let path = args["path"];
        await withDevice(port, baudrate, socket, async (device) => {
            let listing = await device.uploader.listDirectory(path).catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });
            stdout.write("Listing of " + path + ":\n");
            for (let file of listing) {
                stdout.write("  " + file + "\n");
            }
        });
    },
    args: [
        new Arg("path", "Directory to list", { required: true }),
    ]
});
export default cmd;
//# sourceMappingURL=ls.js.map