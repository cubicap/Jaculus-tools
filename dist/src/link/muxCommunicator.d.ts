/// <reference types="node" />
import { Packet, Consumer } from "./linkTypes.js";
import { Mux } from "./mux.js";
import { BufferedInputStreamCommunicator, BufferedInputPacketCommunicator, OutputStreamCommunicator, OutputPacketCommunicator } from "./communicator.js";
export declare class TransparentOutputStreamCommunicator implements OutputStreamCommunicator {
    private mux;
    private channel;
    constructor(mux: Mux, channel: number);
    put(c: number): void;
    write(data: Buffer): void;
}
export declare class UnboundedBufferedInputStreamCommunicator implements BufferedInputStreamCommunicator, Consumer {
    private _onData;
    constructor(mux: Mux, channel: number);
    processPacket(data: Buffer): void;
    onData(callback: (data: Buffer) => void): void;
}
export declare class TransparentOutputPacketCommunicator implements OutputPacketCommunicator {
    private mux;
    private channel;
    constructor(mux: Mux, channel: number);
    buildPacket(): Packet;
    maxPacketSize(): number;
}
export declare class UnboundedBufferedInputPacketCommunicator implements BufferedInputPacketCommunicator, Consumer {
    private _onData;
    constructor(mux: Mux, channel: number);
    processPacket(data: Buffer): void;
    onData(callback: (data: Buffer) => void): void;
}
//# sourceMappingURL=muxCommunicator.d.ts.map