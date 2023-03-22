import { JacDevice } from "../device/jacDevice.js";
import { SerialStream } from "../link/streams/serialStream.js";
import { SocketStream } from "../link/streams/socketStream.js";
import { SerialPort } from "serialport";
import { stdout } from "process";
import { logger } from "../util/logger.js";
import { Env } from "./lib/command.js";


export async function defaultPort(value?: string): Promise<string> {
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

export function defaultBaudrate(value?: string): string {
    if (!value) {
        return "921600";
    }
    return value;
}

export function defaultSocket(value?: string): string {
    if (!value) {
        return "17531";
    }
    return value;
}

export async function getPortSocket(port?: string | boolean, socket?: string | boolean): Promise<{ type: "port" | "socket", value: string }> {
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

export function parseSocket(value: string): [string, number] {
    let parts = value.split(":");
    if (parts.length === 1) {
        return ["localhost", parseInt(parts[0])];
    }
    else if (parts.length > 2) {
        throw new Error("Invalid socket value");
    }

    return [parts[0], parseInt(parts[1])];
}

export async function getDevice(port: string | undefined, baudrate: string | undefined, socket: string | undefined, env: Env): Promise<JacDevice> {
    if (env.device) {
        return env.device.value as JacDevice;
    }

    let where = await getPortSocket(port, socket);
    let device: JacDevice;

    if (where.type === "port") {
        let rate = parseInt(defaultBaudrate(baudrate));
        stdout.write("Connected to serial at " + where.value + " at " + rate + " bauds\n\n");
        device = new JacDevice(new SerialStream(where.value, rate, { "error": (err) => {
            stdout.write("Port error: " + err.message + "\n");
            process.exit(1);
        }}));
    }
    else if (where.type === "socket") {
        let [host, port] = parseSocket(where.value);
        stdout.write("Connected to socket at " + host + ":" + port + "\n\n");
        device = new JacDevice(new SocketStream(host, port, { "error": (err) => {
            stdout.write("Socket error: " + err.message + "\n");
            process.exit(1);
        }}));
    }
    else {
        throw new Error("Invalid port/socket");
    }

    device.logOutput.onData((data) => {
        logger.info("Device: " + data.toString());
    });

    device.debugOutput.onData((data) => {
        logger.debug("Device: " + data.toString());
    });

    env.device = { value: device, onEnd: async (device: JacDevice) => { await device.destroy(); } };

    return device;
}

export async function withDevice(port: string | undefined, baudrate: string | undefined, socket: string | undefined, env: Env,
                                 action: (device: JacDevice) => Promise<void>): Promise<void> {
    let device = await getDevice(port, baudrate, socket, env);
    await action(device);
    await device.destroy();
}
