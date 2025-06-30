import { Arg, Command, Opt } from "./lib/command.js";
import { stdout } from "process";
import noble, { Peripheral } from '@stoprocent/noble';

const cmd = new Command("List available BLE devices", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        const timeout = options["timeout"] ? Number(options["timeout"]) : 4000;
        const showUuids = !!options["show-uuids"];
        const table: { name: string, rssi: string, uuid?: string }[] = [{ name: "Name", rssi: "RSSI", uuid: showUuids ? "UUID" : undefined }];
        const discovered = new Set<string>();

        function handleDiscovery(peripheral: Peripheral) {
            const name = peripheral.advertisement.localName || "(no name)";
            const rssi = peripheral.rssi.toString();
            const uuid = peripheral.id;
            if (discovered.has(peripheral.id)) return;
            if (peripheral.connectable === false) return;
            discovered.add(peripheral.id);
            table.push(showUuids ? { name, rssi, uuid } : { name, rssi });
        }

        try {
            console.log('Waiting for Bluetooth adapter...');
            await noble.waitForPoweredOnAsync();
            console.log('Bluetooth adapter ready');
            console.log(`Scanning BLE devices for ${timeout / 1000} seconds...`);
            await noble.startScanningAsync([], false);
            noble.on('discover', handleDiscovery);
            await new Promise(resolve => setTimeout(resolve, timeout));
        } catch (error) {
            console.error('Error discovering BLE devices:', error);
        } finally {
            await noble.stopScanningAsync();
            noble.stop();
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
        }
        return;
    },
    options: {
        "timeout": new Opt("Scan timeout in milliseconds (default: 4000)", { defaultValue: "4000" }),
        "show-uuids": new Opt("Show UUIDs of discovered devices", { isFlag: true }),
    },
});

export default cmd;
