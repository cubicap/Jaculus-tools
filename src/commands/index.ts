import { Command } from "commander";


const program = new Command();
program
    .name("jac")
    .description("Tools for controlling devices running Jaculus")
    .executableDir("src/commands")


program.command("list-ports", "List available serial ports")
program.command("serial-socket", "Tunnel serial port over TCP socket")

program.command("monitor", "Monitor program output on selected connection")

program.command("ls", "List directory")
program.command("read", "Read file")
program.command("write", "Write file")
program.command("mkdir", "Create directory")
program.command("rm", "Remove file")
program.command("rmdir", "Remove directory")
program.command("upload", "Upload file/directory")

program.command("start", "Start program")
program.command("stop", "Stop program")
program.command("status", "Get device status")

program.parse(process.argv);
