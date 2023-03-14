import { Duplex } from "../link/stream.js";
import { TransparentOutputStreamCommunicator, UnboundedBufferedInputStreamCommunicator } from "../link/muxCommunicator.js";
import { Uploader } from "./uploader.js";
import { Controller } from "./controller.js";
export declare class JacDevice {
    private _mux;
    programOutput: UnboundedBufferedInputStreamCommunicator;
    programInput: TransparentOutputStreamCommunicator;
    logOutput: UnboundedBufferedInputStreamCommunicator;
    controller: Controller;
    uploader: Uploader;
    constructor(connection: Duplex);
    onError(callback: (err: any) => void): void;
    onEnd(callback: () => void): void;
    destroy(): Promise<void>;
}
//# sourceMappingURL=jacDevice.d.ts.map