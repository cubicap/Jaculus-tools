import { logger } from "../util/logger.js";
class MuxPacket {
    constructor(mux, channel, serializer) {
        this._mux = mux;
        this._channel = channel;
        this._serializer = serializer;
    }
    put(c) {
        return this._serializer.put(c);
    }
    space() {
        return this._serializer.capacity() - this._serializer.size();
    }
    send() {
        this._mux._stream.write(this._serializer.finalize(this._channel));
    }
}
;
export class Mux {
    constructor(PacketizerCtor, SerializerCtor, stream) {
        this.closed = false;
        this._stream = stream;
        this._channels = {};
        this._stream.onData((data) => this.receive(data));
        this.PacketizerCtor = PacketizerCtor;
        this.SerializerCtor = SerializerCtor;
        this._packetizer = new this.PacketizerCtor();
        this._serializerCapacity = new this.SerializerCtor().capacity();
    }
    receive(data) {
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
    buildPacket(channel) {
        if (this.closed) {
            throw new Error("Mux is closed");
        }
        return new MuxPacket(this, channel, new this.SerializerCtor());
    }
    maxPacketSize() {
        return this._serializerCapacity;
    }
    subscribeChannel(channel, consumer) {
        if (!consumer) {
            delete this._channels[channel];
            return;
        }
        this._channels[channel] = consumer;
    }
    setGlobalCallback(callback) {
        this._globalCallback = callback;
    }
    onError(callback) {
        this._stream.onError(callback);
    }
    onEnd(callback) {
        this._stream.onEnd(() => {
            this.closed = true;
            if (callback) {
                callback();
            }
        });
    }
    destroy() {
        return this._stream.destroy();
    }
}
;
//# sourceMappingURL=mux.js.map