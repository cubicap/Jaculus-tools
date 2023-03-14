/// <reference types="node" />
import { BufferedInputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";
export declare enum ControllerCommand {
    START = 1,
    STOP = 2,
    STATUS = 3,
    OK = 32,
    ERROR = 33
}
export declare class Controller {
    private _in;
    private _out;
    private _onPacket?;
    constructor(in_: BufferedInputPacketCommunicator, out: OutputPacketCommunicator);
    processPacket(data_: Buffer): boolean;
    start(path: string): Promise<ControllerCommand>;
    stop(): Promise<ControllerCommand>;
    status(): Promise<{
        running: boolean;
        exitCode?: number;
        status: string;
    }>;
}
//# sourceMappingURL=controller.d.ts.map