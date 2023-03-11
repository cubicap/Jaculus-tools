import { Command, OptionValues } from "commander";
import { getDevice } from "./util.js";
import { stdout } from "process";

const program = new Command();

program
    .option("-p, --port [path]", "Serial port to use")
    .option("-b, --baudrate [baudrate]", "Baudrate to use", "921600")
    .option("-s, --socket [port]", "host:port to listen on")
    .argument("<path>", "File to read");


program.action(async (path: string, options: OptionValues) => {
    let device = await getDevice(options.port, options.baudrate, options.socket);

    device.uploader.readFile(path).then((data) => {
        stdout.write(data);
        process.exit(0);
    }
    ).catch((err) => {
        stdout.write("Error: " + err + "\n");
        process.exit(1);
    });
});

program.parse(process.argv);
