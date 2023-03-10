import { Mux } from "./src/link/mux.js"
import { SerialStream } from "./src/link/serialStream.js";
import { Uploader, Command as UpCommand } from "./src/device/uploader.js";
import { Controller, Command as CtrlCommand } from "./src/device/controller.js";
import { TransparentOutputPacketCommunicator, UnboundedBufferedInputPacketCommunicator, UnboundedBufferedInputStreamCommunicator } from "./src/link/muxCommunicator.js";
import * as readline from "readline"
import { stdout } from "process";
import { SerialPort } from "serialport";


function printHelp() {
    stdout.write("Usage: node index.js [options]\n");
    stdout.write("Options:\n");
    stdout.write("  -p, --port <path>  Serial port to use\n");
    stdout.write("  -l, --list         List available serial ports\n");
    stdout.write("  -h, --help         Show this page\n");
}


async function main() {
    let portPath: string | undefined = undefined;

    if (process.argv.length > 2) {
        for (let i = 2; i < process.argv.length; i++) {
            if (process.argv[i] == "-p" || process.argv[i] == "--port") {
                if (i + 1 >= process.argv.length) {
                    stdout.write("Missing argument for -p\n");
                    return;
                }
                portPath = process.argv[i + 1];
                i++;
            }
            else if (process.argv[i] == "-h" || process.argv[i] == "--help") {
                printHelp();
                return;
            }
            else if (process.argv[i] == "-l" || process.argv[i] == "--list") {
                stdout.write("Available serial ports:\n");
                let table: { path: string, manufacturer?: string }[] = [ { path: "Path", manufacturer: "Manufacturer" } ];
                let ports = await SerialPort.list();
                for (let port of ports) {
                    table.push({
                        path: port.path,
                        manufacturer: port.manufacturer
                    });
                }
                let maxPathLength = 0;
                for (let row of table) {
                    maxPathLength = Math.max(maxPathLength, row.path.length);
                }
                let first = true;
                for (let row of table) {
                    stdout.write("  " + row.path.padEnd(maxPathLength) + "  " + (row.manufacturer || "") + "\n");
                    if (first) {
                        first = false;
                        stdout.write("  " + "-".repeat(maxPathLength) + "  " + "-".repeat(12) + "\n");
                        continue;
                    }
                }
                return;
            }
        }
    }

    if (portPath == undefined) {
        let ports = await SerialPort.list();
        if (ports.length == 0) {
            stdout.write("No serial ports found\n");
            return;
        }
        portPath = ports[0].path
    }

    let mux = new Mux(new SerialStream(
        portPath,
        921600
    ));

    let logInput = new UnboundedBufferedInputStreamCommunicator(mux, 255);
    logInput.onData((data) => {
        stdout.write("L: " + data.toString("utf8") + "\n");
    });

    let debugInput = new UnboundedBufferedInputStreamCommunicator(mux, 254);
    debugInput.onData((data) => {
        stdout.write("D: " + data.toString("utf8") + "\n");
    });

    let uploader = new Uploader(
        new UnboundedBufferedInputPacketCommunicator(mux, 1),
        new TransparentOutputPacketCommunicator(mux, 1)
    );

    let controller = new Controller(
        new UnboundedBufferedInputPacketCommunicator(mux, 0),
        new TransparentOutputPacketCommunicator(mux, 0)
    );

    let programOutput = new UnboundedBufferedInputStreamCommunicator(mux, 2);
    let programOutputData = "";
    function bufferProgramOutput(data: Buffer) {
        programOutputData += data.toString("utf8");
    }
    programOutput.onData(bufferProgramOutput);


    let r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    r1.on("close", () => {
        process.exit(0);
    });
    r1.setPrompt("> ");

    async function processCommand(answer: string, rl: readline.Interface) {
        let args = answer.split(" ");
        let cmd = args[0];
        args.shift();

        if (cmd == "exit") {
            process.exit(0);
        }
        else if (cmd == "ls") {
            await uploader.listDirectory(args[0]).then((files) => {
                stdout.write(files.join(" ") + "\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (UpCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "read") {
            await uploader.readFile(args[0]).then((data) => {
                stdout.write(Buffer.from(data).toString("utf8") + "\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (UpCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "write") {
            let str = ""
            await new Promise((resolve, reject) => {
                let cbk = async (line: string) => {
                    if (line == "\\") {
                        let data = Buffer.from(str, "utf8");
                        await uploader.writeFile(args[0], data).then((cmd) => {
                            stdout.write("OK\n");
                        }
                        ).catch((err) => {
                            stdout.write("ERROR: " + (UpCommand[err] || err.toString()) + "\n");
                        })
                        rl.off("line", cbk);
                        resolve(null);
                    }
                    str += line + "\n";
                }
                rl.on("line", cbk);
            });
        }
        else if (cmd == "rm") {
            await uploader.deleteFile(args[0]).then((cmd) => {
                stdout.write("OK" + "\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (UpCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "mkdir") {
            await uploader.createDirectory(args[0]).then((cmd) => {
                stdout.write("OK" + "\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (UpCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "rmdir") {
            await uploader.deleteDirectory(args[0]).then((cmd) => {
                stdout.write("OK" + "\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (UpCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "upload") {
            let from = args[0];
            let to = args[1];

            await uploader.upload(from, to).then((cmd) => {
                stdout.write("OK\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (UpCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "start") {
            await controller.start(args[0]).then((cmd) => {
                stdout.write("OK\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (CtrlCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "stop") {
            await controller.stop().then((cmd) => {
                stdout.write("OK\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (CtrlCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "status") {
            await controller.status().then((cmd) => {
                stdout.write("Running: " + cmd.running + "\n");
                if (!cmd.running) {
                    stdout.write("Last exit code: " + cmd.exitCode + "\n");
                }
                stdout.write(cmd.status + "\n");
            }).catch((err) => {
                stdout.write("ERROR: " + (CtrlCommand[err] || err.toString()) + "\n");
            })
        }
        else if (cmd == "output") {
            stdout.write(programOutputData + "\n");
            programOutputData = "";
        }
        else if (cmd == "monitor") {
            await new Promise((resolve, reject) => {
                stdout.write(programOutputData);
                programOutputData = "";
                programOutput.onData((data: Buffer) => {
                    stdout.write(data.toString("utf8"));
                });
                let cbk = async (line: string) => {
                    rl.off("line", cbk);
                    programOutput.onData(bufferProgramOutput);
                    resolve(null);
                }
                rl.on("line", cbk);
            });
        }
        else if (cmd == "help") {
            stdout.write("  ls <dir>\n");
            stdout.write("  read <file>\n");
            stdout.write("  write <file>\n");
            stdout.write("  rm <file>\n");
            stdout.write("  mkdir <dir>\n");
            stdout.write("  rmdir <dir>\n");
            stdout.write("  upload <from> <to>\n");
            stdout.write("  start <file>\n");
            stdout.write("  stop\n");
            stdout.write("  status\n");
            stdout.write("  output\n");
            stdout.write("  monitor\n");
            stdout.write("  exit\n");
        }
        else {
            stdout.write("Unknown command\n");
        }
    };

    function prompt() {
        r1.question("> ", async (answer) => {
            await processCommand(answer, r1);
            prompt();
        });
    }

    prompt();
}

main();
