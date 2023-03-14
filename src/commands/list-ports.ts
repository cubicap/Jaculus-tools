import { Command } from "./lib/command.js";
import { stdout } from "process";
import { SerialPort } from "serialport";


let cmd = new Command("List available serial ports", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
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
});

export default cmd;
