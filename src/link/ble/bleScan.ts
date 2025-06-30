import noble, { Peripheral } from '@stoprocent/noble';

export interface BleScanResult {
    name: string;
    rssi: string;
    uuid?: string;
}

export async function scanBleDevices(timeout: number = 4000, showUuids: boolean = false): Promise<BleScanResult[]> {
    const table: BleScanResult[] = [];
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
    } finally {
        await noble.stopScanningAsync();
        noble.stop();
        console.log(`Scan finished. Devices found: ${table.length}`);
    }
    return table;
}
