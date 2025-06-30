import noble, { Peripheral, Characteristic } from '@stoprocent/noble';
import { stderr } from 'process';

export class BleClient {
    private foundPeripheral: Peripheral | undefined;
    private cleanupDone = false;
    private exitHandler: (() => Promise<void>) | undefined;

    async connect(target: string, serviceUUID = '00ff', charUUID = 'ff01', scanTimeout = 10000): Promise<Characteristic> {
        stderr.write(`Connecting to BLE device: ${target}\n`);
        await noble.waitForPoweredOnAsync();
        this.foundPeripheral = undefined;
        this.cleanupDone = false;
        try {
            if (this.isUuid(target)) {
                await this.tryDirectConnect(target);
            }
            if (!this.foundPeripheral) {
                await this.scanForPeripheral(target, scanTimeout);
            }
            if (!this.foundPeripheral) {
                stderr.write('BLE device not found\n');
                throw new Error('BLE device not found');
            }
            await this.connectPeripheral();
            stderr.write('Connected to BLE device.\n');
            const char = await this.getCharacteristic(serviceUUID, charUUID);
            this.setupExitCleanup();
            return char;
        } finally {
            await this.cleanup();
        }
    }

    private isUuid(target: string): boolean {
        return /^[0-9a-fA-F]{32}$/.test(target.replace(/-/g, ""));
    }

    private async tryDirectConnect(target: string) {
        try {
            this.foundPeripheral = await noble.connectAsync(target);
            stderr.write(`Direct connection successful to: ${this.foundPeripheral.id}\n`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            stderr.write(`Direct connection failed: ${msg}\n`);
        }
    }

    private async scanForPeripheral(target: string, scanTimeout: number) {
        await noble.startScanningAsync();
        await new Promise<void>((resolve, reject) => {
            const onDiscover = async (peripheral: Peripheral) => {
                if (peripheral.id === target || peripheral.advertisement.localName === target) {
                    this.foundPeripheral = peripheral;
                    await noble.stopScanningAsync();
                    noble.removeListener('discover', onDiscover);
                    resolve();
                }
            };
            noble.on('discover', onDiscover);
            setTimeout(() => {
                noble.removeListener('discover', onDiscover);
                noble.stopScanningAsync();
                if (!this.foundPeripheral) reject(new Error('BLE device not found'));
            }, scanTimeout);
        });
    }

    private async connectPeripheral() {
        if (!this.foundPeripheral) return;
        if (!this.foundPeripheral.state || this.foundPeripheral.state !== 'connected') {
            await this.foundPeripheral.connectAsync();
        }
    }

    private async getCharacteristic(serviceUUID: string, charUUID: string): Promise<Characteristic> {
        if (!this.foundPeripheral) throw new Error('No peripheral connected');
        const { characteristics } = await this.foundPeripheral.discoverSomeServicesAndCharacteristicsAsync([
            serviceUUID
        ], [
            charUUID
        ]);
        const char = characteristics.find(c => c.uuid === charUUID);
        if (!char) {
            stderr.write(`BLE characteristic ${charUUID} not found\n`);
            await this.foundPeripheral.disconnectAsync();
            throw new Error(`BLE characteristic ${charUUID} not found`);
        }
        return char;
    }

    private setupExitCleanup() {
        this.exitHandler = async () => {
            try { await this.foundPeripheral?.disconnectAsync(); } catch {}
            await this.cleanup();
        };
        process.once('SIGINT', this.exitHandler);
        process.once('SIGQUIT', this.exitHandler);
        process.once('SIGTERM', this.exitHandler);
    }

    async cleanup() {
        if (this.cleanupDone) return;
        this.cleanupDone = true;
        try { await noble.stopScanningAsync(); } catch {}
        noble.removeAllListeners('discover');
    }
}
