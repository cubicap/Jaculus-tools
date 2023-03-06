import { Packet, Consumer, EOF } from "./linkTypes.js";
import { Mux } from "./mux.js";
import { BufferedInputStreamCommunicator, BufferedInputPacketCommunicator, OutputStreamCommunicator, OutputPacketCommunicator } from "./communicator.js";
import Queue from "queue-fifo"


export class TransparentOutputStreamCommunicator implements OutputStreamCommunicator {
    private mux: Mux;
    private channel: number;

    constructor(mux: Mux, channel: number) {
        this.mux = mux;
        this.channel = channel;
    }

    public put(c: number): void {
        this.write(Buffer.from([c]));
    }

    public write(data: Buffer): void {
        let packet = this.mux.buildPacket(this.channel);
        for (let c of data) {
            if (packet.put(c)) {
                packet.send();
                packet = this.mux.buildPacket(this.channel);
            }
        }
        if (packet.space() < this.mux.maxPacketSize()) {
            packet.send();
        }
    }
};

export class UnboundedBufferedInputStreamCommunicator implements BufferedInputStreamCommunicator, Consumer {
    private _onData: (data: Buffer) => void = () => { };

    constructor(mux: Mux, channel: number) {
        mux.subscribeChannel(channel, this);
    }

    public processPacket(data: Buffer): void {
        this._onData(data);
    }

    public onData(callback: (data: Buffer) => void): void {
        this._onData = callback;
    }
};


export class TransparentOutputPacketCommunicator implements OutputPacketCommunicator {
    private mux: Mux;
    private channel: number;

    constructor(mux: Mux, channel: number) {
        this.mux = mux;
        this.channel = channel;
    }

    public buildPacket(): Packet {
        return this.mux.buildPacket(this.channel);
    }

    public maxPacketSize(): number {
        return this.mux.maxPacketSize();
    }
};


export class UnboundedBufferedInputPacketCommunicator implements BufferedInputPacketCommunicator, Consumer {
    private _onData: (data: Buffer) => void = () => { };

    constructor(mux: Mux, channel: number) {
        mux.subscribeChannel(channel, this);
    }

    public processPacket(data: Buffer): void {
        this._onData(data);
    }

    public onData(callback: (data: Buffer) => void): void {
        this._onData = callback;
    }
};
