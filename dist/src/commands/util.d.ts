import { JacDevice } from "../device/jacDevice.js";
export declare function defaultPort(value?: string): Promise<string>;
export declare function defaultBaudrate(value?: string): string;
export declare function defaultSocket(value?: string): string;
export declare function getPortSocket(port?: string | boolean, socket?: string | boolean): Promise<{
    type: "port" | "socket";
    value: string;
}>;
export declare function parseSocket(value: string): [string, number];
export declare function getDevice(port?: string, baudrate?: string, socket?: string): Promise<JacDevice>;
export declare function withDevice(port: string | undefined, baudrate: string | undefined, socket: string | undefined, action: (device: JacDevice) => Promise<void>): Promise<void>;
//# sourceMappingURL=util.d.ts.map