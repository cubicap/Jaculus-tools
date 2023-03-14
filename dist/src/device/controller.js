import { logger } from "../util/logger.js";
export var ControllerCommand;
(function (ControllerCommand) {
    ControllerCommand[ControllerCommand["START"] = 1] = "START";
    ControllerCommand[ControllerCommand["STOP"] = 2] = "STOP";
    ControllerCommand[ControllerCommand["STATUS"] = 3] = "STATUS";
    ControllerCommand[ControllerCommand["OK"] = 32] = "OK";
    ControllerCommand[ControllerCommand["ERROR"] = 33] = "ERROR";
})(ControllerCommand || (ControllerCommand = {}));
;
export class Controller {
    constructor(in_, out) {
        this._in = in_;
        this._out = out;
        this._in.onData((data) => {
            this.processPacket(data);
        });
    }
    processPacket(data_) {
        let data = Buffer.from(data_);
        if (data.length < 1) {
            return false;
        }
        let cmd = data[0];
        if (this._onPacket) {
            return this._onPacket(cmd, data.slice(1));
        }
        return false;
    }
    start(path) {
        logger.verbose("Starting program: " + path);
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd, data) => {
                if (cmd == ControllerCommand.OK) {
                    resolve(cmd);
                }
                else {
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
    stop() {
        logger.verbose("Stopping program");
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd, data) => {
                if (cmd == ControllerCommand.OK) {
                    resolve(cmd);
                }
                else {
                    reject(cmd);
                }
                return true;
            };
            let packet = this._out.buildPacket();
            packet.put(ControllerCommand.STOP);
            packet.send();
        });
    }
    status() {
        logger.verbose("Getting status");
        return new Promise((resolve, reject) => {
            this._onPacket = (cmd, data) => {
                if (cmd == ControllerCommand.STATUS && data.length > 0) {
                    resolve({
                        running: data[0] == 1,
                        exitCode: data[1],
                        status: data.slice(2).toString("utf8"),
                    });
                }
                else {
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
//# sourceMappingURL=controller.js.map