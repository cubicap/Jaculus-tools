import { JacDevice } from "../device/jacDevice.js";
import { SerialStream } from "../link/streams/serialStream.js";
import { SocketStream } from "../link/streams/socketStream.js";
import { SerialPort } from "serialport";
import { stderr, stdout } from "process";
import { logger } from "../util/logger.js";
import { Env } from "./lib/command.js";
import readline from "readline";
import noble, { Peripheral } from '@stoprocent/noble';
import { BLEStream } from "../link/streams/bleStream.js";


export async function defaultPort(value?: string): Promise<string> {
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

export async function getPortSocketBle(port?: string | boolean, socket?: string | boolean, ble?: string | boolean): Promise<{ type: "port" | "socket" | "ble", value: string }> {
    const count = [!!port, !!socket, !!ble].filter(Boolean).length;
    if (count !== 1) {
        stderr.write("Must specify exactly one of: serial port, socket, or BLE\n");
        throw 1;
    }

    if (port) {
        return { type: "port", value: port === true ? await defaultPort() : port };
    }

    if (socket) {
        return { type: "socket", value: socket === true ? defaultSocket() : socket };
    }

    if (ble) {
        // BLE does not have a default, must be a string
        if (ble === true) {
            stderr.write("Must specify BLE device identifier\n");
            throw 1;
        }
        return { type: "ble", value: ble };
    }

    // Should never reach here
    stderr.write("Unknown error in getPortSocketBle\n");
    throw 1;
}

export function parseSocket(value: string): [string, number] {
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



export async function getDevice(port: string | undefined, baudrate: string | undefined, socket: string | undefined, ble: string | undefined, env: Env): Promise<JacDevice> {
    if (env.device) {
        return env.device.value as JacDevice;
    }

    const where = await getPortSocketBle(port, socket, ble);

    let device: JacDevice | undefined = undefined;

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
    else if (where.type === "ble") {
        // BLE connection by localName or UUID
        const target = where.value;
        stderr.write(`Connecting to BLE device: ${target}\n`);
        await noble.waitForPoweredOnAsync();
        let foundPeripheral: Peripheral | undefined;
        let cleanupDone = false;
        const cleanup = async () => {
            if (cleanupDone) return;
            cleanupDone = true;
            try { await noble.stopScanningAsync(); } catch {}
            noble.removeAllListeners('discover');
        };
        // Helper: is UUID (32 hex chars)
        const isUuid = /^[0-9a-fA-F]{32}$/.test(target.replace(/-/g, ""));
        try {
            if (isUuid) {
                // Try direct connection by UUID
                try {
                    foundPeripheral = await noble.connectAsync(target);
                    stderr.write(`Direct connection successful to: ${foundPeripheral.id}\n`);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    stderr.write(`Direct connection failed: ${msg}\n`);
                }
            }
            if (!foundPeripheral) {
                // Scan for device by name or UUID
                await noble.startScanningAsync();
                const timeout = 10000;
                await new Promise<void>((resolve, reject) => {
                    const onDiscover = async (peripheral: Peripheral) => {
                        if (peripheral.id === target || peripheral.advertisement.localName === target) {
                            foundPeripheral = peripheral;
                            await noble.stopScanningAsync();
                            noble.removeListener('discover', onDiscover);
                            resolve();
                        }
                    };
                    noble.on('discover', onDiscover);
                    setTimeout(() => {
                        noble.removeListener('discover', onDiscover);
                        noble.stopScanningAsync();
                        if (!foundPeripheral) reject(new Error('BLE device not found'));
                    }, timeout);
                });
            }
            if (!foundPeripheral) {
                stderr.write('BLE device not found\n');
                throw 1;
            }
            // Connect if not already connected
            if (!foundPeripheral.state || foundPeripheral.state !== 'connected') {
                await foundPeripheral.connectAsync();
            }
            stderr.write('Connected to BLE device.\n');
            // Discover services and characteristics
            const { characteristics } = await foundPeripheral.discoverSomeServicesAndCharacteristicsAsync([
                '00ff'
            ], [
                'ff01'
            ]);
            const char = characteristics.find(c => c.uuid === 'ff01');
            if (!char) {
                stderr.write('BLE characteristic ff01 not found\n');
                await foundPeripheral.disconnectAsync();
                throw 1;
            }
            // Create JacDevice with BLEStream
            device = new JacDevice(new BLEStream(char));
            stderr.write('JacDevice BLE connection established.\n');
            // Cleanup on exit
            const exitHandler = async () => {
                try { await foundPeripheral?.disconnectAsync(); } catch {}
                await cleanup();
                try { await device?.destroy(); } catch {}
            };
            process.once('SIGINT', exitHandler);
            process.once('SIGQUIT', exitHandler);
            process.once('SIGTERM', exitHandler);
        } finally {
            await cleanup();
        }
    }

    if (!device) {
        stderr.write("Invalid port/socket\n");
        throw 1;
    }
    device = device as JacDevice;


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

    env.device = { value: device, onEnd: async (device: JacDevice) => { await device.destroy(); } };

    device.onEnd(() => {
        logger.error("Device disconnected");
        process.exit(1);
    });

    return device;
}

export async function withDevice(port: string | undefined, baudrate: string | undefined,
    socket: string | undefined, ble: string | undefined, env: Env, action: (device: JacDevice) => Promise<void>
): Promise<void> {
    const device = await getDevice(port, baudrate, socket, ble, env);
    await action(device);
    await device.destroy();
}


export async function readPassword(prompt: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin });
    readline.emitKeypressEvents(process.stdin, rl);
    process.stdin.setRawMode(true);

    stdout.write(prompt);

    let stringPassword = "";
    await new Promise((resolve, reject) => {
        process.stdin.on("keypress", (str, key) => {
            if (key.ctrl && key.name === "c") {
                process.stdin.setRawMode(false);
                rl.close();
                reject(1);
                return;
            }
            if (key.sequence === "\r") {
                if (stringPassword.length >= 8 || stringPassword.length === 0) {
                    stdout.write("\n");
                    resolve(null);
                } else {
                    stdout.write("\n");
                    stderr.write("Password too short\n");
                    reject(1);
                }
            } else if (key.sequence === "\b" || key.sequence === "\x7f") {
                if (stringPassword.length === 0) {
                    return;
                }
                stdout.write("\b \b");
                stringPassword = stringPassword.slice(0, -1);
            } else {
                stringPassword += key.sequence;
                stdout.write("*");
            }
        });
    });
    return stringPassword;
}