#!/usr/bin/env node

import { Opt, Arg, Command, Program } from "./lib/command.js";
import { logger } from "../util/logger.js";
import { stdout } from "process";


let jac = new Program("jac", "Tools for controlling devices running Jaculus", {
    globalOptions: {
        "log-level": new Opt("Set log level", { defaultValue: "info" }),
        "help": new Opt("Print this help message", { isFlag: true }),
        "port": new Opt("Serial port to use (default: first available)"),
        "baudrate": new Opt("Baudrate to use", { defaultValue: "921600" }),
        "socket": new Opt("host:port to use"),
    },
    action: async (options: Record<string, string | boolean>) => {
        if (options["help"]) {
            stdout.write(jac.help() + "\n");
            process.exit(0);
        }

        logger.level = options["log-level"] as string;
    }
});

jac.addCommand("help", new Command("Print help for given command", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let command = args["command"];
        if (command) {
            let cmd = jac.getCommand(command);
            if (cmd) {
                stdout.write(cmd.help(command) + "\n");
            }
            else {
                stdout.write(`Unknown command: ${command}` + "\n");
            }
        }
        else {
            stdout.write(jac.help() + "\n");
        }
    },
    args: [
        new Arg("command", "The command to get help for", { required: false }),
    ],
}));


import listPorts from "./list-ports.js";
import serialSocket from "./serial-socket.js";
import install from "./install.js";
import compile from "./build.js";
import flash from "./flash.js";
import ls from "./ls.js";
import read from "./read.js";
import write from "./write.js";
import rm from "./rm.js";
import mkdir from "./mkdir.js";
import rmdir from "./rmdir.js";
import upload from "./upload.js";
import start from "./start.js";
import stop from "./stop.js";
import status from "./status.js";
import monitor from "./monitor.js";

jac.addCommand("list-ports", listPorts);
jac.addCommand("serial-socket", serialSocket);
jac.addCommand("install", install);
jac.addCommand("build", compile);
jac.addCommand("flash", flash);

jac.addCommand("ls", ls);
jac.addCommand("read", read);
jac.addCommand("write", write);
jac.addCommand("rm", rm);
jac.addCommand("mkdir", mkdir);
jac.addCommand("rmdir", rmdir);
jac.addCommand("upload", upload);


jac.addCommand("start", start);
jac.addCommand("stop", stop);
jac.addCommand("status", status);

jac.addCommand("monitor", monitor);


let args = process.argv.slice(2);

if (args.length === 0) {
    args.push("help");
}

jac.run(args).then(() => {
    console.log("Done");
    process.exit(0);
}
).catch((e) => {
    if (e instanceof Error) {
        console.log(e.message);
        process.exit(0);
    }
    else {
        console.log(e);
        process.exit(0);
    }
});
