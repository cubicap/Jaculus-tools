import { Command, OptionValues } from "commander";
import { getDevice } from "./util.js";

const program = new Command();
const stdout = process.stdout;

program
    .option("-p, --port [path]", "Serial port to use")
    .option("-b, --baudrate [baudrate]", "Baudrate to use", "921600")
    .option("-s, --socket [port]", "host:port to listen on")
    .argument("<path>", "Remote file to run");


program.action(async (path: string, options: OptionValues) => {
    let device = await getDevice(options.port, options.baudrate, options.socket);

    device.controller.start(path).then((cmd) => {
        stdout.write(cmd.toString() + "\n");
        process.exit(0);
    }
    ).catch((err) => {
        stdout.write("Error: " + err + "\n");
        process.exit(1);
    });
});

program.parse(process.argv);
