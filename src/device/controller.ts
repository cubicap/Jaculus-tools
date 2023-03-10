import { BufferedInputPacketCommunicator, OutputPacketCommunicator } from "../link/communicator.js";


export enum Command {
    START = 0x01,
    STOP = 0x02,
    STATUS = 0x03,
    OK = 0x20,
    ERROR = 0x21,
};


export class Controller {
    private _in: BufferedInputPacketCommunicator;
    private _out: OutputPacketCommunicator;

    private _onPacket?: (cmd: Command, data: Buffer) => boolean;

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

        let cmd: Command = data[0];

        if (this._onPacket) {
            return this._onPacket(cmd, data.slice(1));
        }
        return false;
    }

    public start(path: string): Promise<Command> {
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd: Command, data: Buffer) => {
                if (cmd == Command.OK) {
                    resolve(cmd);
                } else {
                    reject(cmd);
                }
                return true;
            };

            let packet = this._out.buildPacket();
            packet.put(Command.START);
            for (let c of path) {
                packet.put(c.charCodeAt(0));
            }
            packet.send();
        });
    }

    public stop(): Promise<Command> {
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd: Command, data: Buffer) => {
                if (cmd == Command.OK) {
                    resolve(cmd);
                } else {
                    reject(cmd);
                }
                return true;
            };

            let packet = this._out.buildPacket();
            packet.put(Command.STOP);
            packet.send();
        });
    }

    public status(): Promise<{ running: boolean, exitCode?: number, status: string }> {
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd: Command, data: Buffer) => {
                if (cmd == Command.STATUS && data.length > 0) {
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
            packet.put(Command.STATUS);
            packet.send();
        });
    }
}
