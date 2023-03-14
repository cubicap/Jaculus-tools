import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";


let cmd = new Command("Read a file from device", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let path = args["path"] as string;

        await withDevice(port, baudrate, socket, async (device) => {
            let data = await device.uploader.readFile(path).catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });

            stdout.write(data);
        });
    },
    args: [
        new Arg("path", "File to read", { required: true }),
    ]
});

export default cmd;
