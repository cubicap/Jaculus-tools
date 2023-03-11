import { Packetizer, Serializer } from "./cobs.js";
import { Consumer, Packet } from "./linkTypes.js";
import { Duplex } from "./stream.js";
import { logger } from "../util/logger.js";

class MuxPacket implements Packet {
    private _mux: Mux;
    private _channel: number;

    public constructor(mux: Mux, channel: number) {
        this._mux = mux;
        this._channel = channel;
    }

    public put(c: number): boolean {
        return this._mux._serializer.put(c);
    }

    public space(): number {
        return this._mux._serializer.capacity() - this._mux._serializer.size();
    }

    public send(): void {
        this._mux._stream.write(this._mux._serializer.finalize(this._channel));
    }
};


export class Mux {
    // TODO: set private
    public _stream: Duplex;

    private _channels: Record<number, Consumer>;
    private _globalCallback?: (channel: number, data: Buffer) => void;

    // TODO: set private
    public _packetizer: Packetizer = new Packetizer();
    public _serializer: Serializer = new Serializer();

    public constructor(stream: Duplex) {
        this._stream = stream;
        this._channels = {};
        this._stream.onData((data: Buffer) => this.receive(data));
    }

    private receive(data: Buffer): void {
        logger.silly("receive『" + data.reduce((a, b) => a + String.fromCharCode(b), "") + "』");
        for (let c of data) {
            if (this._packetizer.put(c)) {
                let result = this._packetizer.decode();
                if (result) {
                    let consumer = this._channels[result.channel];
                    if (consumer) {
                        consumer.processPacket(Buffer.from(result.data));
                    }
                    if (this._globalCallback) {
                        this._globalCallback(result.channel, result.data);
                    }
                }
                else {
                    // XXX: handle invalid packet
                }
            }
        }
    }

    public buildPacket(channel: number): Packet {
        return new MuxPacket(this, channel);
    }

    public maxPacketSize(): number {
        return this._serializer.capacity();
    }

    public subscribeChannel(channel: number, consumer?: Consumer): void {
        if (!consumer) {
            delete this._channels[channel];
            return;
        }
        this._channels[channel] = consumer;
    }

    public setGlobalCallback(callback?: (channel: number, data: Buffer) => void) {
        this._globalCallback = callback;
    }
};
