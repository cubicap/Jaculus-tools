import { BufferedInputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";
import { Packet } from "../link/linkTypes.js";
import * as fs from "fs";


export enum Command {
    READ_FILE = 0x01,
    WRITE_FILE = 0x02,
    DELETE_FILE = 0x03,
    LIST_DIR = 0x04,
    CREATE_DIR = 0x05,
    DELETE_DIR = 0x06,
    HAS_MORE_DATA = 0x10,
    LAST_DATA = 0x11,
    OK = 0x20,
    ERROR = 0x21,
    NOT_FOUND = 0x22,
    CONTINUE = 0x23,
};

// TODO: fix path encoding

export class Uploader {
    private _in: BufferedInputPacketCommunicator;
    private _out: OutputPacketCommunicator;

    private _onData?: (data: Buffer) => boolean;
    private _onDataComplete?: () => boolean;
    private _onOk?: () => boolean;
    private _onError?: (cmd: Command) => boolean;
    private _onContinue?: () => void;

    public constructor(in_: BufferedInputPacketCommunicator, out: OutputPacketCommunicator) {
        this._in = in_;
        this._out = out;
        this._in.onData((data: Buffer) => {
            this.processPacket(data);
        });
    }

    waitContinue(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._onContinue = () => {
                this._onContinue = undefined;
                resolve();
            };
        });
    }

    processPacket(data_: Buffer): boolean {
        let data = Buffer.from(data_);
        if (data.length < 1) {
            return false;
        }

        let cmd: Command = data[0];

        switch (cmd) {
            case Command.HAS_MORE_DATA:
                if (this._onData) {
                    let success = this._onData(data.slice(1));
                    if (!success) {
                        this._onData = undefined;
                        this._onDataComplete = undefined;
                        return false;
                    }
                }
                return true;
            case Command.LAST_DATA:
                if (this._onData) {
                    let success = this._onData(data.slice(1));
                    if (!success) {
                        this._onData = undefined;
                        this._onDataComplete = undefined;
                        return false;
                    }
                    if (this._onDataComplete) {
                        success = this._onDataComplete();
                    }
                    this._onData = undefined;
                    this._onDataComplete = undefined;
                    return success;
                }
                return true;
            case Command.OK:
                if (this._onOk) {
                    let success = this._onOk();
                    this._onOk = undefined;
                    return success;
                }
                return true;
            case Command.ERROR:
            case Command.NOT_FOUND:
                if (this._onError) {
                    let success = this._onError(cmd);
                    this._onError = undefined;
                    return success;
                }
                return true;
            case Command.CONTINUE:
                if (this._onContinue) {
                    this._onContinue();
                }
            default:
                return false;
        }
    }

    public readFile(path: string): Promise<Buffer> {
        console.log("reading file", path);
        return new Promise((resolve, reject) => {
            let data: Buffer = Buffer.alloc(0);
            this._onData = (d: Buffer) => {
                let newData = Buffer.alloc(data.length + d.length);
                newData.set(data);
                newData.set(d, data.length);
                data = newData;
                return true;
            };
            this._onDataComplete = () => {
                resolve(data);
                return true;
            };
            this._onError = (cmd: Command) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(Command.READ_FILE);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        });
    }

    public writeFile(path: string, data: Buffer): Promise<Command> {
        console.log("writing file", path, data.length);
        return new Promise(async (resolve, reject) => {

            this._onOk = () => {
                resolve(Command.OK);
                return true;
            }

            this._onError = (cmd: Command) => {
                reject(cmd);
                return true;
            }

            let packet: Packet | null = this._out.buildPacket();
            packet.put(Command.WRITE_FILE);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.put(0);

            let offset = 0;
            let prefix = Command.HAS_MORE_DATA;
            let last = false;
            do {
                let chunkSize = Math.min(data.length - offset, this._out.maxPacketSize() - 1);
                if (packet != null) {
                    chunkSize = Math.min(chunkSize, packet.space() - 1);
                }
                else {
                    packet = this._out.buildPacket();
                }

                if (offset + chunkSize >= data.length) {
                    last = true;
                    prefix = Command.LAST_DATA;
                }

                packet.put(prefix);
                for (let i = 0; i < chunkSize; i++, offset++) {
                    packet.put(data[offset]);
                }

                packet.send();
                packet = null;
                if (!last) {
                    await this.waitContinue();
                }
            } while (offset < data.length);
        });
    }

    public deleteFile(path: string): Promise<Command> {
        console.log("deleting file", path);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(Command.OK);
                return true;
            }

            this._onError = (cmd: Command) => {
                reject(cmd);
                return true;
            }

            let packet = this._out.buildPacket();
            packet.put(Command.DELETE_FILE);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        });
    }

    public listDirectory(path: string): Promise<string[]> {
        console.log("listing directory", path);
        return new Promise((resolve, reject) => {
            let data: Buffer = Buffer.alloc(0);
            this._onData = (d: Buffer) => {
                let newData = Buffer.alloc(data.length + d.length);
                newData.set(data);
                newData.set(d, data.length);
                data = newData;
                return true;
            };
            this._onDataComplete = () => {
                let files = data.toString("utf8").split("\0");
                files.pop();
                resolve(files);
                return true;
            };
            this._onError = (cmd: Command) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(Command.LIST_DIR);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        });
    }

    public createDirectory(path: string): Promise<Command> {
        console.log("creating directory", path);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(Command.OK);
                return true;
            }

            this._onError = (cmd: Command) => {
                reject(cmd);
                return true;
            }

            let packet = this._out.buildPacket();
            packet.put(Command.CREATE_DIR);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        });
    }

    public deleteDirectory(path: string): Promise<Command> {
        console.log("deleting directory", path);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(Command.OK);
                return true;
            }

            this._onError = (cmd: Command) => {
                reject(cmd);
                return true;
            }

            let packet = this._out.buildPacket();
            packet.put(Command.DELETE_DIR);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        });
    }

    public async upload(from: string, to: string): Promise<Command> {
        try {
            if (fs.lstatSync(from).isDirectory()) {
                let files = fs.readdirSync(from);

                await this.createDirectory(to).catch((cmd: Command) => {
                    throw "Failed to create directory (" + cmd + ")";
                });
                for (let file of files) {
                    await this.upload(from + "/" + file, to + "/" + file).catch((err) => {
                        throw err;
                    });
                }
                return Command.OK;
            }
            else {
                let data = fs.readFileSync(from);

                await this.writeFile(to, data).catch((cmd: Command) => {
                    throw "Failed to write file (" + to + "): " + cmd;
                });
                return Command.OK;
            }
        }
        catch (e) {
            throw e;
        }
    }

    public async push(from: string, to: string): Promise<Command> {
        try {
            if (!fs.lstatSync(from).isDirectory()) {
                throw "Source must be a directory";
            }

            let files = fs.readdirSync(from);
            for (let file of files) {
                await this.upload(from + "/" + file, to + "/" + file).catch((err) => {
                    throw err;
                });
            }
            return Command.OK;
        }
        catch (e) {
            throw e;
        }
    }
}
