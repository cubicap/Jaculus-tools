import { JacDevice } from "../device/jacDevice.js";
import { SerialStream } from "../link/streams/serialStream.js";
import { SocketStream } from "../link/streams/socketStream.js";
import { SerialPort } from "serialport";
import { stderr } from "process";
import { logger } from "../util/logger.js";
export async function defaultPort(value) {
    if (!value) {
        const ports = await SerialPort.list().catch((err) => {
            stderr.write("Error listing serial ports: " + err + "\n");
            throw 1;
        });
        if (ports.length == 0) {
            stderr.write("No serial ports found\n");
            throw 1;
        }
        return ports[0].path;
    }
    return value;
}
export function defaultBaudrate(value) {
    if (!value) {
        return "921600";
    }
    return value;
}
export function defaultSocket(value) {
    if (!value) {
        return "17531";
    }
    return value;
}
export async function getPortSocket(port, socket) {
    if (port && socket) {
        stderr.write("Must specify either a serial port or a socket, not both\n");
        throw 1;
    }
    if (port) {
        return { type: "port", value: port === true ? await defaultPort() : port };
    }
    if (socket) {
        return { type: "socket", value: socket === true ? defaultSocket() : socket };
    }
    return { type: "port", value: await defaultPort() };
}
export function parseSocket(value) {
    const parts = value.split(":");
    if (parts.length === 1) {
        return ["localhost", parseInt(parts[0])];
    }
    else if (parts.length > 2) {
        stderr.write("Invalid socket value\n");
        throw 1;
    }
    return [parts[0], parseInt(parts[1])];
}
export async function getDevice(port, baudrate, socket, env) {
    if (env.device) {
        return env.device.value;
    }
    const where = await getPortSocket(port, socket);
    let device = undefined;
    if (where.type === "port") {
        const rate = parseInt(defaultBaudrate(baudrate));
        stderr.write("Connecting to serial at " + where.value + " at " + rate + " bauds... ");
        await new Promise((resolve, reject) => {
            device = new JacDevice(new SerialStream(where.value, rate, {
                "error": (err) => {
                    stderr.write("\nPort error: " + err.message + "\n");
                    reject(1);
                },
                "open": () => {
                    resolve(null);
                }
            }));
        });
    }
    else if (where.type === "socket") {
        const [host, port] = parseSocket(where.value);
        stderr.write("Connecting to socket at " + host + ":" + port + "... ");
        await new Promise((resolve, reject) => {
            device = new JacDevice(new SocketStream(host, port, {
                "error": (err) => {
                    stderr.write("\nSocket error: " + err.message + "\n");
                    reject(1);
                },
                "open": () => {
                    resolve(null);
                }
            }));
        });
    }
    if (!device) {
        stderr.write("Invalid port/socket\n");
        throw 1;
    }
    device = device;
    stderr.write("Connected.\n\n");
    device.errorOutput.onData((data) => {
        logger.error("Device: " + data.toString());
    });
    device.logOutput.onData((data) => {
        logger.info("Device: " + data.toString());
    });
    device.debugOutput.onData((data) => {
        logger.debug("Device: " + data.toString());
    });
    env.device = { value: device, onEnd: async (device) => { await device.destroy(); } };
    device.onEnd(() => {
        logger.error("Device disconnected");
        process.exit(1);
    });
    return device;
}
export async function withDevice(port, baudrate, socket, env, action) {
    const device = await getDevice(port, baudrate, socket, env);
    await action(device);
    await device.destroy();
}
//# sourceMappingURL=util.js.map