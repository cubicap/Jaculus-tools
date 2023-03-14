import { JacDevice } from "../device/jacDevice.js";
import { SerialStream } from "../link/streams/serialStream.js";
import { SocketStream } from "../link/streams/socketStream.js";
import { SerialPort } from "serialport";
import { stdout } from "process";
export async function defaultPort(value) {
    if (!value) {
        let ports = await SerialPort.list();
        if (ports.length == 0) {
            stdout.write("No serial ports found\n");
            process.exit(1);
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
        stdout.write("Must specify either a serial port or a socket, not both\n");
        process.exit(1);
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
    let parts = value.split(":");
    if (parts.length === 1) {
        return ["localhost", parseInt(parts[0])];
    }
    else if (parts.length > 2) {
        throw new Error("Invalid socket value");
    }
    return [parts[0], parseInt(parts[1])];
}
export async function getDevice(port, baudrate, socket) {
    let where = await getPortSocket(port, socket);
    let device;
    if (where.type === "port") {
        let rate = parseInt(defaultBaudrate(baudrate));
        stdout.write("Connected to serial at " + where.value + " at " + rate + " bauds\n\n");
        device = new JacDevice(new SerialStream(where.value, rate, { "error": (err) => {
                stdout.write("Port error: " + err.message + "\n");
                process.exit(1);
            } }));
    }
    else {
        let [host, port] = parseSocket(where.value);
        stdout.write("Connected to socket at " + host + ":" + port + "\n\n");
        device = new JacDevice(new SocketStream(host, port, { "error": (err) => {
                stdout.write("Socket error: " + err.message + "\n");
                process.exit(1);
            } }));
    }
    return device;
}
export async function withDevice(port, baudrate, socket, action) {
    let device = await getDevice(port, baudrate, socket);
    await action(device);
    await device.destroy();
}
//# sourceMappingURL=util.js.map