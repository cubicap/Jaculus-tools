import { Command, OptionValues } from "commander";
import { getDevice } from "./util.js";
import { stdout } from "process";

const program = new Command();

program
    .option("-p, --port [path]", "Serial port to use")
    .option("-b, --baudrate [baudrate]", "Baudrate to use", "921600")
    .option("-s, --socket [port]", "host:port to listen on");


program.action(async (options: OptionValues) => {
    let device = await getDevice(options.port, options.baudrate, options.socket);

    device.programOutput.onData((data) => {
        stdout.write(data);
    });
});


program.parse(process.argv);
