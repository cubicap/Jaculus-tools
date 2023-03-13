import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";


let cmd = new Command("Flash a directory to device (replace contents of /data)", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let port = options["port"] as string;
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let from = args["from"] as string;

        let device = await getDevice(port, baudrate, socket);

        await device.uploader.deleteDirectory("/data");

        let cmd = await device.uploader.push(from, "/data").catch((err) => {
            stdout.write("Error: " + err + "\n");
            process.exit(1);
        });
        stdout.write(cmd.toString() + "\n");
    },
    args: [
        new Arg("from", "Directory to flash", { required: true }),
    ]
});

export default cmd;
