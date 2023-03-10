import { BufferedInputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";
import { logger } from "../util/logger.js";


export enum ControllerCommand {
    START = 0x01,
    STOP = 0x02,
    STATUS = 0x03,
    OK = 0x20,
    ERROR = 0x21,
};


export class Controller {
    private _in: BufferedInputPacketCommunicator;
    private _out: OutputPacketCommunicator;

    private _onPacket?: (cmd: ControllerCommand, data: Buffer) => boolean;

    public constructor(in_: BufferedInputPacketCommunicator, out: OutputPacketCommunicator) {
        this._in = in_;
        this._out = out;
        this._in.onData((data: Buffer) => {
            this.processPacket(data);
        });
    }

    public processPacket(data_: Buffer): boolean {
        let data = Buffer.from(data_);
        if (data.length < 1) {
            return false;
        }

        let cmd: ControllerCommand = data[0];

        if (this._onPacket) {
            return this._onPacket(cmd, data.slice(1));
        }
        return false;
    }

    public start(path: string): Promise<ControllerCommand> {
        logger.verbose("Starting program: " + path);
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand, data: Buffer) => {
                if (cmd == ControllerCommand.OK) {
                    resolve(cmd);
                } else {
                    reject(cmd);
                }
                return true;
            };

            let packet = this._out.buildPacket();
            packet.put(ControllerCommand.START);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        });
    }

    public stop(): Promise<ControllerCommand> {
        logger.verbose("Stopping program");
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand, data: Buffer) => {
                if (cmd == ControllerCommand.OK) {
                    resolve(cmd);
                } else {
                    reject(cmd);
                }
                return true;
            };

            let packet = this._out.buildPacket();
            packet.put(ControllerCommand.STOP);
            packet.send();
        });
    }

    public status(): Promise<{ running: boolean, exitCode?: number, status: string }> {
        logger.verbose("Getting status");
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd: ControllerCommand, data: Buffer) => {
                if (cmd == ControllerCommand.STATUS && data.length > 0) {
                    resolve({
                        running: data[0] == 1,
                        exitCode: data[1],
                        status: data.slice(2).toString("utf8"),
                    });
                } else {
                    reject(cmd);
                }
                return true;
            };

            let packet = this._out.buildPacket();
            packet.put(ControllerCommand.STATUS);
            packet.send();
        });
    }
}
