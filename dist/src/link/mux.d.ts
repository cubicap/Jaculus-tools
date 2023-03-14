/// <reference types="node" />
import { Packetizer, Serializer } from "./encoders/interface.js";
import { Consumer, Packet } from "./linkTypes.js";
import { Duplex } from "./stream.js";
export declare class Mux {
    private PacketizerCtor;
    private SerializerCtor;
    _stream: Duplex;
    private _channels;
    private _globalCallback?;
    _packetizer: Packetizer;
    _serializerCapacity: number;
    closed: boolean;
    constructor(PacketizerCtor: new () => Packetizer, SerializerCtor: new () => Serializer, stream: Duplex);
    private receive;
    buildPacket(channel: number): Packet;
    maxPacketSize(): number;
    subscribeChannel(channel: number, consumer?: Consumer): void;
    setGlobalCallback(callback?: (channel: number, data: Buffer) => void): void;
    onError(callback: (err: any) => void): void;
    onEnd(callback?: () => void): void;
    destroy(): Promise<void>;
}
//# sourceMappingURL=mux.d.ts.map