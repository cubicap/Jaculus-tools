import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";


let cmd = new Command("List files in a directory", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let path = args["path"] as string;

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
