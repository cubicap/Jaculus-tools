import { Mux } from "../link/mux.js";
import { TransparentOutputPacketCommunicator, UnboundedBufferedInputPacketCommunicator, TransparentOutputStreamCommunicator, UnboundedBufferedInputStreamCommunicator } from "../link/muxCommunicator.js";
import { Uploader } from "./uploader.js";
import { Controller } from "./controller.js";
import { CobsPacketizer, CobsSerializer } from "../link/encoders/cobs.js";
export class JacDevice {
    constructor(connection) {
        this._mux = new Mux(CobsPacketizer, CobsSerializer, connection);
        this.programOutput = new UnboundedBufferedInputStreamCommunicator(this._mux, 2);
        this.programInput = new TransparentOutputStreamCommunicator(this._mux, 2);
        this.logOutput = new UnboundedBufferedInputStreamCommunicator(this._mux, 255);
        this.controller = new Controller(new UnboundedBufferedInputPacketCommunicator(this._mux, 0), new TransparentOutputPacketCommunicator(this._mux, 0));
        this.uploader = new Uploader(new UnboundedBufferedInputPacketCommunicator(this._mux, 1), new TransparentOutputPacketCommunicator(this._mux, 1));
    }
    onError(callback) {
        this._mux.onError(callback);
    }
    onEnd(callback) {
        this._mux.onEnd(callback);
    }
    destroy() {
        return this._mux.destroy();
    }
}
//# sourceMappingURL=jacDevice.js.map