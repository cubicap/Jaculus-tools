/// <reference types="node" />
import { BufferedInputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";
export declare enum UploaderCommand {
    READ_FILE = 1,
    WRITE_FILE = 2,
    DELETE_FILE = 3,
    LIST_DIR = 4,
    CREATE_DIR = 5,
    DELETE_DIR = 6,
    HAS_MORE_DATA = 16,
    LAST_DATA = 17,
    OK = 32,
    ERROR = 33,
    NOT_FOUND = 34,
    CONTINUE = 35
}
export declare class Uploader {
    private _in;
    private _out;
    private _onData?;
    private _onDataComplete?;
    private _onOk?;
    private _onError?;
    private _onContinue?;
    constructor(in_: BufferedInputPacketCommunicator, out: OutputPacketCommunicator);
    waitContinue(): Promise<void>;
    private processPacket;
    encodePath(path_: string, nullTerminate?: boolean): Buffer;
    readFile(path_: string): Promise<Buffer>;
    writeFile(path_: string, data: Buffer): Promise<UploaderCommand>;
    deleteFile(path_: string): Promise<UploaderCommand>;
    listDirectory(path_: string): Promise<string[]>;
    createDirectory(path_: string): Promise<UploaderCommand>;
    deleteDirectory(path_: string): Promise<UploaderCommand>;
    upload(from: string, to: string): Promise<UploaderCommand>;
    push(from: string, to: string): Promise<UploaderCommand>;
}
//# sourceMappingURL=uploader.d.ts.map