import { Arg, Command, Opt } from "./lib/command.js";
import { stdout } from "process";
import noble, { Peripheral } from '@stoprocent/noble';

const cmd = new Command("List available BLE devices", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        const timeout = options["timeout"] ? Number(options["timeout"]) : 4000;
        const table: { name: string, rssi: string }[] = [{ name: "Name", rssi: "RSSI" }];
        const discovered = new Set<string>();

        function handleDiscovery(peripheral: Peripheral) {
            const name = peripheral.advertisement.localName || "(no name)";
            const rssi = peripheral.rssi.toString();
            if (discovered.has(peripheral.id)) return;
            if (peripheral.connectable === false) return;
            discovered.add(peripheral.id);
            table.push({ name, rssi });
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
            for (const row of table) {
                maxNameLength = Math.max(maxNameLength, row.name.length);
            }
            let first = true;
            for (const row of table) {
                stdout.write(row.name.padEnd(maxNameLength) + "  " + row.rssi + "\n");
                if (first) {
                    first = false;
                    stdout.write("-".repeat(maxNameLength) + "  " + "-".repeat(4) + "\n");
                }
            }
        }
        return;
    },
    options: {
        "timeout": new Opt("Scan timeout in milliseconds (default: 4000)", { defaultValue: "4000" }),
    },
});

export default cmd;
