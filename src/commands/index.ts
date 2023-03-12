#!/usr/bin/env node

import { Command, OptionValues } from "commander";

const program = new Command();
program
    .name("jac")
    .description("Tools for controlling devices running Jaculus")
    .option("-l, --log-level [level]", "Log level", "info");

let { operands, unknown } = program.parseOptions(process.argv);

process.env.LOG_LEVEL = program.opts().logLevel;


program.command("list-ports", "List available serial ports");
program.command("serial-socket", "Tunnel serial port over TCP socket");

program.command("monitor", "Monitor program output on selected connection");

program.command("ls", "List directory");
program.command("read", "Read file");
program.command("write", "Write file");
program.command("mkdir", "Create directory");
program.command("rm", "Remove file");
program.command("rmdir", "Remove directory");
program.command("upload", "Upload file/directory");
program.command("flash", "Flash directory (replace contents of /data)");

program.command("start", "Start program");
program.command("stop", "Stop program");
program.command("status", "Get device status");

program.command("compile", "Compile TypeScript files");

program.command("install", "Install Jaculus on device");


program.parse([...operands, ...unknown]);
