import { Mux } from "../link/mux.js";
import { Duplex } from "../link/stream.js";
import {
    TransparentOutputPacketCommunicator, UnboundedBufferedInputPacketCommunicator,
    TransparentOutputStreamCommunicator, UnboundedBufferedInputStreamCommunicator
} from "../link/muxCommunicator.js";
import { Uploader } from "./uploader.js";
import { Controller } from "./controller.js";
import { CobsPacketizer, CobsSerializer } from "../link/encoders/cobs.js";


export class JacDevice {
    private _mux: Mux;

    public programOutput: UnboundedBufferedInputStreamCommunicator;
    public programInput: TransparentOutputStreamCommunicator;

    public logOutput: UnboundedBufferedInputStreamCommunicator;

    public controller: Controller;
    public uploader: Uploader;

    public constructor(connection: Duplex) {
        this._mux = new Mux(CobsPacketizer, CobsSerializer, connection);

        this.programOutput = new UnboundedBufferedInputStreamCommunicator(this._mux, 2);
        this.programInput = new TransparentOutputStreamCommunicator(this._mux, 2);

        this.logOutput = new UnboundedBufferedInputStreamCommunicator(this._mux, 255);

        this.controller = new Controller(
            new UnboundedBufferedInputPacketCommunicator(this._mux, 0),
            new TransparentOutputPacketCommunicator(this._mux, 0)
        );

        this.uploader = new Uploader(
            new UnboundedBufferedInputPacketCommunicator(this._mux, 1),
            new TransparentOutputPacketCommunicator(this._mux, 1)
        );
    }

    public onError(callback: (err: any) => void): void {
        this._mux.onError(callback);
    }

    public onEnd(callback: () => void): void {
        this._mux.onEnd(callback);
    }

    public destroy(): void {
        this._mux.destroy();
    }
}
