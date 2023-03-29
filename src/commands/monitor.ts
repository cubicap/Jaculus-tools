import { Command, Env, Opt } from "./lib/command.js";
import { stdout } from "process";
import { getDevice } from "./util.js";
import chalk from "chalk";
import readline from 'readline';


let cmd = new Command("Monitor program output", {
    action: (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        return new Promise(async (resolve, reject) => {
            let echo = !(options["no-echo"] as boolean);

            let rl = readline.createInterface({ input: process.stdin });
            readline.emitKeypressEvents(process.stdin, rl);
            process.stdin.setRawMode(true);

            let port = options["port"] as string;
            let baudrate = options["baudrate"] as string;
            let socket = options["socket"] as string;

            let device = await getDevice(port, baudrate, socket, env);

            device.programOutput.onData((data) => {
                stdout.write(data);
            });
            device.programError.onData((data) => {
                stdout.write(chalk.red(data));
            });

            process.stdin.on('keypress', (str, key) => {
                if (key.ctrl && key.name === 'c') {
                    device.programOutput.onData((data) => { });
                    device.programError.onData((data) => { });
                    process.stdin.setRawMode(false);
                    rl.close();
                    resolve();
                }
                else {
                    if (echo) {
                        if (key.sequence === "\r") {
                            stdout.write("\r\n");
                        }
                        else if (str) {
                            stdout.write(str);
                        }
                    }
                    let out = key.sequence;
                    if (out === "\r") {
                        out = "\n";
                    }
                    device.programInput.write(Buffer.from(out, "utf-8"));
                }
            });
        });
    },
    options: {
        "no-echo": new Opt("Echo input", { isFlag: true }),
    },
    chainable: true
});

export default cmd;
