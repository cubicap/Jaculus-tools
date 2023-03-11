import { Command, OptionValues } from "commander";
import { getDevice } from "./util.js";
import { stdout } from "process";

const program = new Command();

program
    .option("-p, --port [path]", "Serial port to use")
    .option("-b, --baudrate [baudrate]", "Baudrate to use", "921600")
    .option("-s, --socket [port]", "host:port to listen on")
    .argument("<from>", "Source path")
    .argument("<to>", "Destination path");


program.action(async (from: string, to: string, options: OptionValues) => {
    let device = await getDevice(options.port, options.baudrate, options.socket);

    device.uploader.upload(from, to).then((cmd) => {
        stdout.write(cmd.toString() + "\n");
        process.exit(0);
    }
    ).catch((err) => {
        stdout.write("Error: " + err + "\n");
        process.exit(1);
    });
});

program.parse(process.argv);
