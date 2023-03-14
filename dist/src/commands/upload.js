import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
let cmd = new Command("Upload a file/directory to device", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        let local = args["local"];
        let remote = args["remote"];
        await withDevice(port, baudrate, socket, async (device) => {
            let cmd = await device.uploader.upload(local, remote).catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });
            stdout.write(cmd.toString() + "\n");
        });
    },
    args: [
        new Arg("local", "File to upload", { required: true }),
        new Arg("remote", "Remote file to upload to", { required: true }),
    ]
});
export default cmd;
//# sourceMappingURL=upload.js.map