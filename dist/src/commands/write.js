import { Arg, Command } from "./lib/command.js";
import { stdout } from "process";
import { withDevice } from "./util.js";
import * as readline from "readline";
let cmd = new Command("Write a file to device", {
    action: async (options, args) => {
        let port = options["port"];
        let baudrate = options["baudrate"];
        let socket = options["socket"];
        let path = args["path"];
        await withDevice(port, baudrate, socket, async (device) => {
            let str = "";
            await new Promise((resolve, reject) => {
                let rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rl.on("line", (line) => {
                    if (line == "\\") {
                        rl.close();
                        resolve(null);
                        return;
                    }
                    str += line + "\n";
                });
            });
            let cmd = await device.uploader.writeFile(path, Buffer.from(str, "utf-8")).catch((err) => {
                stdout.write("Error: " + err + "\n");
                process.exit(1);
            });
            stdout.write(cmd.toString() + "\n");
        });
    },
    args: [
        new Arg("path", "File to write", { required: true }),
    ]
});
export default cmd;
//# sourceMappingURL=write.js.map