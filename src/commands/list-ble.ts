import { Arg, Command, Opt } from "./lib/command.js";
import { stdout } from "process";
import { scanBleDevices } from "../link/ble/bleScan.js";

const cmd = new Command("List available BLE devices", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        const timeout = options["timeout"] ? Number(options["timeout"]) : 4000;
        const showUuids = !!options["show-uuids"];
        // Scan for BLE devices
        let table = await scanBleDevices(timeout, showUuids);
        // Add header row
        table = [{ name: "Name", rssi: "RSSI", uuid: showUuids ? "UUID" : undefined }, ...table];
        // Output formatting
        let maxNameLength = 0;
        let maxUuidLength = 0;
        for (const row of table) {
            maxNameLength = Math.max(maxNameLength, row.name.length);
            if (showUuids && row.uuid) maxUuidLength = Math.max(maxUuidLength, row.uuid.length);
        }
        let first = true;
        for (const row of table) {
            let line = row.name.padEnd(maxNameLength) + "  " + row.rssi.padEnd(4);
            if (showUuids && row.uuid) line += "  " + row.uuid.padEnd(maxUuidLength);
            stdout.write(line + "\n");
            if (first) {
                first = false;
                let sep = "-".repeat(maxNameLength) + "  " + "-".repeat(4);
                if (showUuids) sep += "  " + "-".repeat(maxUuidLength);
                stdout.write(sep + "\n");
            }
        }
        return;
    },
    options: {
        "timeout": new Opt("Scan timeout in milliseconds (default: 4000)", { defaultValue: "4000" }),
        "show-uuids": new Opt("Show UUIDs of discovered devices", { isFlag: true }),
    },
});

export default cmd;
