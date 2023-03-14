import * as fs from "fs";
import { logger } from "../util/logger.js";
import path from "path";
export var UploaderCommand;
(function (UploaderCommand) {
    UploaderCommand[UploaderCommand["READ_FILE"] = 1] = "READ_FILE";
    UploaderCommand[UploaderCommand["WRITE_FILE"] = 2] = "WRITE_FILE";
    UploaderCommand[UploaderCommand["DELETE_FILE"] = 3] = "DELETE_FILE";
    UploaderCommand[UploaderCommand["LIST_DIR"] = 4] = "LIST_DIR";
    UploaderCommand[UploaderCommand["CREATE_DIR"] = 5] = "CREATE_DIR";
    UploaderCommand[UploaderCommand["DELETE_DIR"] = 6] = "DELETE_DIR";
    UploaderCommand[UploaderCommand["HAS_MORE_DATA"] = 16] = "HAS_MORE_DATA";
    UploaderCommand[UploaderCommand["LAST_DATA"] = 17] = "LAST_DATA";
    UploaderCommand[UploaderCommand["OK"] = 32] = "OK";
    UploaderCommand[UploaderCommand["ERROR"] = 33] = "ERROR";
    UploaderCommand[UploaderCommand["NOT_FOUND"] = 34] = "NOT_FOUND";
    UploaderCommand[UploaderCommand["CONTINUE"] = 35] = "CONTINUE";
})(UploaderCommand || (UploaderCommand = {}));
;
export class Uploader {
    constructor(in_, out) {
        this._in = in_;
        this._out = out;
        this._in.onData((data) => {
            this.processPacket(data);
        });
    }
    waitContinue() {
        return new Promise((resolve, reject) => {
            this._onContinue = () => {
                this._onContinue = undefined;
                resolve();
            };
        });
    }
    processPacket(data_) {
        let data = Buffer.from(data_);
        if (data.length < 1) {
            return false;
        }
        let cmd = data[0];
        switch (cmd) {
            case UploaderCommand.HAS_MORE_DATA:
                if (this._onData) {
                    let success = this._onData(data.slice(1));
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
                    let success = this._onOk();
                    this._onOk = undefined;
                    return success;
                }
                return true;
            case UploaderCommand.ERROR:
            case UploaderCommand.NOT_FOUND:
                if (this._onError) {
                    let success = this._onError(cmd);
                    this._onError = undefined;
                    return success;
                }
                return true;
            case UploaderCommand.CONTINUE:
                if (this._onContinue) {
                    this._onContinue();
                }
            default:
                return false;
        }
    }
    encodePath(path_, nullTerminate = true) {
        let data = Buffer.alloc(path_.length + (nullTerminate ? 1 : 0));
        for (let i = 0; i < path_.length; i++) {
            data[i] = path_.charCodeAt(i);
        }
        if (nullTerminate) {
            data[path_.length] = 0;
        }
        return data;
    }
    readFile(path_) {
        logger.verbose("Reading file: " + path_);
        return new Promise((resolve, reject) => {
            let data = Buffer.alloc(0);
            this._onData = (d) => {
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
            this._onError = (cmd) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(UploaderCommand.READ_FILE);
            for (let b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }
    writeFile(path_, data) {
        logger.verbose("Writing file: " + path_ + " - " + data.length);
        return new Promise(async (resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };
            this._onError = (cmd) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(UploaderCommand.WRITE_FILE);
            for (let b of this.encodePath(path_, true)) {
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
                packet.send();
                packet = null;
                if (!last) {
                    await this.waitContinue();
                }
            } while (offset < data.length);
        });
    }
    deleteFile(path_) {
        logger.verbose("Deleting file: " + path_);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };
            this._onError = (cmd) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(UploaderCommand.DELETE_FILE);
            for (let b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }
    listDirectory(path_) {
        logger.verbose("Listing directory: " + path_);
        return new Promise((resolve, reject) => {
            let data = Buffer.alloc(0);
            this._onData = (d) => {
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
            this._onError = (cmd) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(UploaderCommand.LIST_DIR);
            for (let b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }
    createDirectory(path_) {
        logger.verbose("Creating directory: " + path_);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };
            this._onError = (cmd) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(UploaderCommand.CREATE_DIR);
            for (let b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }
    deleteDirectory(path_) {
        logger.verbose("Deleting directory: " + path_);
        return new Promise((resolve, reject) => {
            this._onOk = () => {
                resolve(UploaderCommand.OK);
                return true;
            };
            this._onError = (cmd) => {
                reject(cmd);
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(UploaderCommand.DELETE_DIR);
            for (let b of this.encodePath(path_, false)) {
                packet.put(b);
            }
            packet.send();
        });
    }
    async upload(from, to) {
        logger.info("Uploading " + from + " to " + to);
        try {
            if (fs.lstatSync(from).isDirectory()) {
                let files = fs.readdirSync(from);
                await this.createDirectory(to).catch((cmd) => {
                    throw "Failed to create directory (" + cmd + ")";
                });
                for (let file of files) {
                    await this.upload(path.join(from, file), to + "/" + file).catch((err) => {
                        throw err;
                    });
                }
                return UploaderCommand.OK;
            }
            else {
                let data = fs.readFileSync(from);
                await this.writeFile(to, data).catch((cmd) => {
                    throw "Failed to write file (" + to + "): " + cmd;
                });
                return UploaderCommand.OK;
            }
        }
        catch (e) {
            throw e;
        }
    }
    async push(from, to) {
        logger.verbose("Pushing " + from + " to " + to);
        try {
            if (!fs.lstatSync(from).isDirectory()) {
                throw "Source must be a directory";
            }
            let files = fs.readdirSync(from);
            for (let file of files) {
                await this.upload(path.join(from, file), to + "/" + file).catch((err) => {
                    throw err;
                });
            }
            return UploaderCommand.OK;
        }
        catch (e) {
            throw e;
        }
    }
}
//# sourceMappingURL=uploader.js.map