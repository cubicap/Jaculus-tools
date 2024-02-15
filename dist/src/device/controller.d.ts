/// <reference types="node" />
import { InputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";
export declare enum ControllerCommand {
    START = 1,
    STOP = 2,
    STATUS = 3,
    VERSION = 4,
    LOCK = 16,
    UNLOCK = 17,
    FORCE_UNLOCK = 18,
    OK = 32,
    ERROR = 33,
    LOCK_NOT_OWNED = 34
}
export declare const ControllerCommandStrings: Record<ControllerCommand, string>;
export declare class Controller {
    private _in;
    private _out;
    private _onPacket?;
    private cancel;
    constructor(in_: InputPacketCommunicator, out: OutputPacketCommunicator);
    processPacket(data_: Buffer): boolean;
    start(path: string): Promise<void>;
    stop(): Promise<void>;
    status(): Promise<{
        running: boolean;
        exitCode?: number;
        status: string;
    }>;
    version(): Promise<string[]>;
    lock(): Promise<void>;
    unlock(): Promise<void>;
    forceUnlock(): Promise<void>;
}
//# sourceMappingURL=controller.d.ts.map