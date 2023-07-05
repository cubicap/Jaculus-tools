import { InputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";
import { logger } from "../util/logger.js";
import { TimeoutPromise } from "../util/timeoutPromise.js";


const TIMEOUT_MS = 5000;

export enum ControllerCommand {
    START = 0x01,
    STOP = 0x02,
    STATUS = 0x03,
    VERSION = 0x04,
    LOCK = 0x10,
    UNLOCK = 0x11,
    FORCE_UNLOCK = 0x12,
    OK = 0x20,
    ERROR = 0x21,
    LOCK_NOT_OWNED = 0x22,
}

export const ControllerCommandStrings: Record<ControllerCommand, string> = {
    [ControllerCommand.START]: "START",
    [ControllerCommand.STOP]: "STOP",
    [ControllerCommand.STATUS]: "STATUS",
    [ControllerCommand.VERSION]: "VERSION",
    [ControllerCommand.LOCK]: "LOCK",
    [ControllerCommand.UNLOCK]: "UNLOCK",
    [ControllerCommand.FORCE_UNLOCK]: "FORCE_UNLOCK",
    [ControllerCommand.OK]: "OK",
    [ControllerCommand.ERROR]: "ERROR",
    [ControllerCommand.LOCK_NOT_OWNED]: "LOCK_NOT_OWNED",
};


export class Controller {
    private _in: InputPacketCommunicator;
    private _out: OutputPacketCommunicator;

    private _onPacket?: (cmd: ControllerCommand, data: Buffer) => boolean;

    private cancel(): void {
        this._onPacket = undefined;
    }

    public constructor(in_: InputPacketCommunicator, out: OutputPacketCommunicator) {
        this._in = in_;
        this._out = out;
        this._in.onData((data: Buffer) => {
            this.processPacket(data);
        });
    }

    public processPacket(data_: Buffer): boolean {
        const data = Buffer.from(data_);
        if (data.length < 1) {
            return false;
        }

        const cmd: ControllerCommand = data[0];

        if (this._onPacket) {
            return this._onPacket(cmd, data.slice(1));
        }
        return false;
    }

    public start(path: string): Promise<void> {
        logger.verbose("Starting program: " + path);
        return new TimeoutPromise(TIMEOUT_MS, (resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand) => {
                if (cmd == ControllerCommand.OK) {
                    resolve();
                } else {
                    reject(ControllerCommandStrings[cmd]);
                }
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(ControllerCommand.START);
            for (const c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        }, () => {
            this.cancel();
        });
    }

    public stop(): Promise<void> {
        logger.verbose("Stopping program");
        return new TimeoutPromise(TIMEOUT_MS, (resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand) => {
                if (cmd == ControllerCommand.OK) {
                    resolve();
                } else {
                    reject(ControllerCommandStrings[cmd]);
                }
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(ControllerCommand.STOP);
            packet.send();
        }, () => {
            this.cancel();
        });
    }

    public status(): Promise<{ running: boolean, exitCode?: number, status: string }> {
        logger.verbose("Getting status");
        return new TimeoutPromise(TIMEOUT_MS, (resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand, data: Buffer) => {
                if (cmd == ControllerCommand.STATUS && data.length > 0) {
                    resolve({
                        running: data[0] == 1,
                        exitCode: data[1],
                        status: data.slice(2).toString("utf8"),
                    });
                } else {
                    reject(ControllerCommandStrings[cmd]);
                }
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(ControllerCommand.STATUS);
            packet.send();
        }, () => {
            this.cancel();
        });
    }

    public version(): Promise<string[]> {
        logger.verbose("Getting version");
        return new TimeoutPromise(TIMEOUT_MS, (resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand, data: Buffer) => {
                if (cmd == ControllerCommand.VERSION && data.length > 0) {
                    const res = [];
                    for (let row of data.toString("utf8").split("\n")) {
                        row = row.trim();
                        if (row.length > 0) {
                            res.push(row);
                        }
                    }

                    resolve(res);
                } else {
                    reject(ControllerCommandStrings[cmd]);
                }
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(ControllerCommand.VERSION);
            packet.send();
        }, () => {
            this.cancel();
        });
    }

    public lock(): Promise<void> {
        logger.verbose("Locking controller");
        return new TimeoutPromise(TIMEOUT_MS, (resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand) => {
                if (cmd == ControllerCommand.OK) {
                    setTimeout(resolve, 10);
                } else {
                    reject(ControllerCommandStrings[cmd]);
                }
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(ControllerCommand.LOCK);
            packet.send();
        }, () => {
            this.cancel();
        });
    }

    public unlock(): Promise<void> {
        logger.verbose("Unlocking controller");
        return new TimeoutPromise(TIMEOUT_MS, (resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand) => {
                if (cmd == ControllerCommand.OK) {
                    resolve();
                } else {
                    reject(ControllerCommandStrings[cmd]);
                }
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(ControllerCommand.UNLOCK);
            packet.send();
        }, () => {
            this.cancel();
        });
    }

    public forceUnlock(): Promise<void> {
        logger.verbose("Force unlocking controller");
        return new TimeoutPromise(TIMEOUT_MS, (resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand) => {
                if (cmd == ControllerCommand.OK) {
                    resolve();
                } else {
                    reject(ControllerCommandStrings[cmd]);
                }
                return true;
            };

            const packet = this._out.buildPacket();
            packet.put(ControllerCommand.FORCE_UNLOCK);
            packet.send();
        }, () => {
            this.cancel();
        });
    }
}
