/// <reference types="node" />
import { Serializer, Packetizer } from "./interface";
declare class PacketStructure {
    protected DELIMITER: number;
    protected SIZE_CHECKSUM: number;
    protected SIZE_LENGTH: number;
    protected SIZE_CHANNEL: number;
    protected OFFSET_DELIMITER: number;
    protected OFFSET_LENGTH: number;
    protected OFFSET_COBS: number;
    protected OFFSET_CHANNEL: number;
    protected OFFSET_DATA: number;
    protected SIZE_DATA_MAX: number;
    protected buffer: Buffer;
}
export declare class CobsSerializer extends PacketStructure implements Serializer {
    private _dataSize;
    capacity(): number;
    size(): number;
    is_empty(): boolean;
    reset(): void;
    put(c: number): boolean;
    finalize(channel: number): Buffer;
}
export declare class CobsPacketizer extends PacketStructure implements Packetizer {
    private length;
    private expectedLength;
    reset(): void;
    put(c: number): boolean;
    decode(): {
        channel: number;
        data: Buffer;
    } | null;
}
export {};
//# sourceMappingURL=cobs.d.ts.map