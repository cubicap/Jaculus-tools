// BLEStream implements Duplex for BLE characteristic
import { Characteristic } from "@stoprocent/noble";
import { Duplex } from "../stream.js";

export class BLEStream implements Duplex {
    private characteristic: Characteristic;
    private callbacks: {
        "data"?: (data: Buffer) => void,
        "error"?: (err: any) => void,
        "end"?: () => void
    } = {};
    private isOpen = true;

    constructor(characteristic: Characteristic) {
        this.characteristic = characteristic;
        this.characteristic.on('data', (data: Buffer) => {
            if (this.callbacks["data"]) this.callbacks["data"](data);
        });
        this.characteristic.on('error', (err: any) => {
            if (this.callbacks["error"]) this.callbacks["error"](err);
        });
        this.characteristic.subscribe();
    }

    public put(c: number): void {
        this.write(Buffer.from([c]));
    }

    public write(buf: Buffer): void {
        if (!this.isOpen) throw new Error('BLEStream is closed');
        this.characteristic.write(buf, false, (err: Error | undefined) => {
            if (err && this.callbacks["error"]) this.callbacks["error"](err);
        });
    }

    public onData(callback?: (data: Buffer) => void): void {
        this.callbacks["data"] = callback;
    }

    public onEnd(callback?: () => void): void {
        this.callbacks["end"] = callback;
    }

    public onError(callback?: (err: any) => void): void {
        this.callbacks["error"] = callback;
    }

    public destroy(): Promise<void> {
        this.isOpen = false;
        this.characteristic.unsubscribe();
        if (this.callbacks["end"]) this.callbacks["end"]();
        return Promise.resolve();
    }
}
