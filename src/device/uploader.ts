import { BufferedInputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";
import { Packet } from "../link/linkTypes.js";
import * as fs from "fs";
import { logger } from "../util/logger.js";
import path from "path";


export enum UploaderCommand {
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
    LOCK_NOT_OWNED = 0x24,
}

export class Uploader {
    private _in: BufferedInputPacketCommunicator;
    private _out: OutputPacketCommunicator;

    private _onData?: (data: Buffer) => boolean;
    private _onDataComplete?: () => boolean;
    private _onOk?: () => boolean;
    private _onError?: (cmd: UploaderCommand) => boolean;
    private _onContinue?: () => void;

    public constructor(in_: BufferedInputPacketCommunicator, out: OutputPacketCommunicator) {
        this._in = in_;
        this._out = out;
        this._in.onData((data: Buffer) => {
            this.processPacket(data);
        });
    }

    waitContinue(callback: () => void): Promise<void> {
        return new Promise((resolve) => {
            this._onContinue = () => {
                this._onContinue = undefined;
                resolve();
            };
            callback();
        });
    }

    private processPacket(data_: Buffer): boolean {
        const data = Buffer.from(data_);
        if (data.length < 1) {
            return false;
        }

        const cmd: UploaderCommand = data[0];

        switch (cmd) {
        case UploaderCommand.HAS_MORE_DATA:
            if (this._onData) {
                const success = this._onData(data.slice(1));
                if (!success) {
                    this._onData = undefined;
                    this._onDataComplete = undefined;
                    return false;
                }
            }
            return true;
        case UploaderCommand.LAST_DATA:
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
        case UploaderCommand.OK:
            if (this._onOk) {
                const success = this._onOk();
                this._onOk = undefined;
                return success;
            }
            return true;
        case UploaderCommand.CONTINUE:
            if (this._onContinue) {
                this._onContinue();
            }
            return true;
        case UploaderCommand.ERROR:
        case UploaderCommand.NOT_FOUND:
        case UploaderCommand.LOCK_NOT_OWNED:
            if (this._onError) {
                const success = this._onError(cmd);
                this._onError = undefined;
                return success;
            }
            return true;
        default:
            if (this._onError) {
                const success = this._onError(cmd);
                this._onError = undefined;
                return success;
            }
            return false;
        }
    }

    public encodePath(path_: string, nullTerminate = true): Buffer {
        const data = Buffer.alloc(path_.length + (nullTerminate ? 1 : 0));
        for (let i = 0; i < path_.length; i++) {
            data[i] = path_.charCodeAt(i);
        }
        if (nullTerminate) {
            data[path_.length] = 0;
        }
        return data;
    }

    public readFile(path_: string): Promise<Buffer> {
        logger.verbose("Reading file: " + path_);
        return new Promise((resolve, reject) => {
            let data: Buffer = Buffer.alloc(0);
            this._onData = (d: Buffer) => {
                const newData = Buffer.alloc(data.length + d.length);
                newData.set(data);
                newData.set(d, data.length);
                data = newData;
                return true;
            };
            this._onDataComplete = () => {
                resolve(data);
                return true;
            };
            this._onError = (cmd: UploaderCommand) => {
                reject(cmd);
                return true;
            };
            const packet = this._out.buildPacket();
            packet.put(UploaderCommand.READ_FILE);
            for (const b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }

    public writeFile(path_: string, data: Buffer): Promise<UploaderCommand> {
        logger.verbose("Writing file: " + path_ + " - " + data.length);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };

            this._onError = (cmd: UploaderCommand) => {
                reject(cmd);
                return true;
            };

            (async () => {
                let packet: Packet | null = this._out.buildPacket();
                packet.put(UploaderCommand.WRITE_FILE);
                for (const b of this.encodePath(path_, true)) {
                    packet.put(b);
                }

                let offset = 0;
                let prefix = UploaderCommand.HAS_MORE_DATA;
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
                        prefix = UploaderCommand.LAST_DATA;
                    }

                    packet.put(prefix);
                    for (let i = 0; i < chunkSize; i++, offset++) {
                        packet.put(data[offset]);
                    }

                    if (!last) {
                        await this.waitContinue(() => { (packet as Packet).send(); });
                    }
                    else {
                        packet.send();
                    }
                    packet = null;
                } while (offset < data.length);
            })();
        });
    }

    public deleteFile(path_: string): Promise<UploaderCommand> {
        logger.verbose("Deleting file: " + path_);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };

            this._onError = (cmd: UploaderCommand) => {
                reject(cmd);
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(UploaderCommand.DELETE_FILE);
            for (const b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }

    public listDirectory(path_: string, flags = ""): Promise<[string, boolean, number][]> {
        logger.verbose("Listing directory: " + path_ + " - '" + flags + "'");
        return new Promise((resolve, reject) => {
            let data: Buffer = Buffer.alloc(0);
            this._onData = (d: Buffer) => {
                const newData = Buffer.alloc(data.length + d.length);
                newData.set(data);
                newData.set(d, data.length);
                data = newData;
                return true;
            };
            this._onDataComplete = () => {
                const buffer = Buffer.alloc(270);
                let bufferIn = 0;
                const result: [string, boolean, number][] = [];
                for (let i = 0; i < data.length; i++) {
                    const b = data[i];
                    if (b == 0) {
                        let name = buffer.toString("utf8", 0, buffer.indexOf(0));
                        const isDir = name.charAt(0) == "d";
                        name = name.slice(1);
                        let size = 0;
                        for (let off = 0; off < 4; off++) {
                            logger.debug("size: " + size + " + " + data[i + off + 1]);
                            size <<= 8;
                            size |= data[i + off + 1];
                        }
                        i += 4;
                        result.push([name, isDir, size]);
                        buffer.fill(0);
                        bufferIn = 0;
                    }
                    else {
                        buffer[bufferIn++] = b;
                    }
                }
                resolve(result);
                return true;
            };
            this._onError = (cmd: UploaderCommand) => {
                reject(cmd);
                return true;
            };
            const packet = this._out.buildPacket();
            packet.put(UploaderCommand.LIST_DIR);
            for (const b of this.encodePath(path_, true)) {
                packet.put(b);
            }
            for (const b of flags) {
                packet.put(b.charCodeAt(0));
            }
            packet.send();
        });
    }

    public createDirectory(path_: string): Promise<UploaderCommand> {
        logger.verbose("Creating directory: " + path_);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };

            this._onError = (cmd: UploaderCommand) => {
                reject(cmd);
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(UploaderCommand.CREATE_DIR);
            for (const b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }

    public deleteDirectory(path_: string): Promise<UploaderCommand> {
        logger.verbose("Deleting directory: " + path_);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };

            this._onError = (cmd: UploaderCommand) => {
                reject(cmd);
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(UploaderCommand.DELETE_DIR);
            for (const b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }

    public async upload(from: string, to: string): Promise<UploaderCommand> {
        logger.info("Uploading " + from + " to " + to);
        if (fs.lstatSync(from).isDirectory()) {
            const files = fs.readdirSync(from);

            await this.createDirectory(to).catch((cmd: UploaderCommand) => {
                throw "Failed to create directory (" + cmd + ")";
            });
            for (const file of files) {
                await this.upload(path.join(from, file), to + "/" + file).catch((err) => {
                    throw err;
                });
            }
            return UploaderCommand.OK;
        }
        else {
            const data = fs.readFileSync(from);

            await this.writeFile(to, data).catch((cmd: UploaderCommand) => {
                throw "Failed to write file (" + to + "): " + cmd;
            });
            return UploaderCommand.OK;
        }
    }

    public async push(from: string, to: string): Promise<UploaderCommand> {
        logger.verbose("Pushing " + from + " to " + to);
        if (!fs.lstatSync(from).isDirectory()) {
            throw "Source must be a directory";
        }

        const files = fs.readdirSync(from);
        for (const file of files) {
            await this.upload(path.join(from, file), to + "/" + file).catch((err) => {
                throw err;
            });
        }
        return UploaderCommand.OK;
    }

    private async pullFile(from: string, to: string): Promise<UploaderCommand> {
        logger.info("Pulling " + from + " to " + to);

        const data = await this.readFile(from).catch((cmd: UploaderCommand) => {
            throw "Failed to read file (" + cmd + ")";
        });

        fs.writeFileSync(to, data);

        return UploaderCommand.OK;
    }

    private async pullDir(from: string, to: string): Promise<UploaderCommand> {
        logger.info("Pulling " + from + " to " + to);

        const files = await this.listDirectory(from).catch((cmd: UploaderCommand) => {
            throw "Failed to list directory (" + cmd + ")";
        });

        if (!fs.existsSync(to)) {
            fs.mkdirSync(to);
        }
        if (!fs.lstatSync(to).isDirectory()) {
            throw "Destination must be a directory";
        }
        if (fs.readdirSync(to).length > 0) {
            throw "Destination directory is not empty";
        }

        for (const file of files) {
            const name = file[0];
            const isDir = file[1];
            if (isDir) {
                await this.pullDir(from + "/" + name, to + "/" + name).catch((err) => {
                    throw err;
                });
            }
            else {
                await this.pullFile(from + "/" + name, to + "/" + name).catch((err) => {
                    throw err;
                });
            }
        }
        return UploaderCommand.OK;
    }

    public async pull(from: string, to: string): Promise<UploaderCommand> {
        logger.verbose("Pulling " + from + " to " + to);

        const [, isDir, ] = await this.listDirectory(from).catch((cmd: UploaderCommand) => {
            throw "Failed to get file type (" + cmd + ")";
        });

        if (isDir) {
            return this.pullDir(from, to);
        }

        return this.pullFile(from, to);
    }
}
