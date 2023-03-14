export class TransparentOutputStreamCommunicator {
    constructor(mux, channel) {
        this.mux = mux;
        this.channel = channel;
    }
    put(c) {
        this.write(Buffer.from([c]));
    }
    write(data) {
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
}
;
export class UnboundedBufferedInputStreamCommunicator {
    constructor(mux, channel) {
        this._onData = () => { };
        mux.subscribeChannel(channel, this);
    }
    processPacket(data) {
        this._onData(data);
    }
    onData(callback) {
        this._onData = callback;
    }
}
;
export class TransparentOutputPacketCommunicator {
    constructor(mux, channel) {
        this.mux = mux;
        this.channel = channel;
    }
    buildPacket() {
        return this.mux.buildPacket(this.channel);
    }
    maxPacketSize() {
        return this.mux.maxPacketSize();
    }
}
;
export class UnboundedBufferedInputPacketCommunicator {
    constructor(mux, channel) {
        this._onData = () => { };
        mux.subscribeChannel(channel, this);
    }
    processPacket(data) {
        this._onData(data);
    }
    onData(callback) {
        this._onData = callback;
    }
}
;
//# sourceMappingURL=muxCommunicator.js.map