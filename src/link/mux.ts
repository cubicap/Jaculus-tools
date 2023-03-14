import { Packetizer, Serializer } from "./encoders/interface.js";
import { Consumer, Packet } from "./linkTypes.js";
import { Duplex } from "./stream.js";
import { logger } from "../util/logger.js";


class MuxPacket implements Packet {
    private _mux: Mux;
    private _channel: number;
    private _serializer: Serializer;

    public constructor(mux: Mux, channel: number, serializer: Serializer) {
        this._mux = mux;
        this._channel = channel;
        this._serializer = serializer;
    }

    public put(c: number): boolean {
        return this._serializer.put(c);
    }

    public space(): number {
        return this._serializer.capacity() - this._serializer.size();
    }

    public send(): void {
        this._mux._stream.write(this._serializer.finalize(this._channel));
    }
};


export class Mux {
    private PacketizerCtor: new () => Packetizer;
    private SerializerCtor: new () => Serializer;

    // TODO: set private
    public _stream: Duplex;

    private _channels: Record<number, Consumer>;
    private _globalCallback?: (channel: number, data: Buffer) => void;

    // TODO: set private
    public _packetizer: Packetizer;
    public _serializerCapacity: number;

    public closed: boolean = false;

    public constructor(PacketizerCtor: new () => Packetizer, SerializerCtor: new () => Serializer, stream: Duplex) {
        this._stream = stream;
        this._channels = {};
        this._stream.onData((data: Buffer) => this.receive(data));

        this.PacketizerCtor = PacketizerCtor;
        this.SerializerCtor = SerializerCtor;
        this._packetizer = new this.PacketizerCtor();
        this._serializerCapacity = new this.SerializerCtor().capacity();
    }

    private receive(data: Buffer): void {
        if (this.closed) {
            throw new Error("Mux is closed");
        }
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
        if (this.closed) {
            throw new Error("Mux is closed");
        }
        return new MuxPacket(this, channel, new this.SerializerCtor());
    }

    public maxPacketSize(): number {
        return this._serializerCapacity;
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

    public onError(callback: (err: any) => void) {
        this._stream.onError(callback);
    }

    public onEnd(callback?: () => void): void {
        this._stream.onEnd(() => {
            this.closed = true;
            if (callback) {
                callback();
            }
        });
    }

    public destroy(): void {
        this._stream.destroy();
    }
};
