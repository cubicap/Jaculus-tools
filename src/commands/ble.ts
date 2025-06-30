import { Arg, Command, Env } from "./lib/command.js";
import { stdout, stderr } from "process";
import { getDevice } from "./util.js";


enum BleKvNs {
    Main = "ble_cfg",
}

enum BleKeys {
    Mode = "mode",
    Name = "name",
}

enum BleMode {
    DISABLED,
    ENABLED_STREAM,

    // TODO: Can we add this for the future? (use will handle the BLE yourself)
    UNMANAGED,
}

export const bleGet = new Command("Display current BLE config", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const ble = options["ble"] as string | undefined;

        const device = await getDevice(port, baudrate, socket, ble, env);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        stdout.write("\n-----\n");

        await device.controller.lock().catch((err) => {
            stderr.write("Error locking device: " + err + "\n");
            throw 1;
        });

        const mode = await device.controller.configGetInt(BleKvNs.Main, BleKeys.Mode);
        const name = await device.controller.configGetString(BleKvNs.Main, BleKeys.Name);

        stdout.write(`BLE Mode: ${BleMode[mode]}
Device Name: ${name}
`);

        await device.controller.unlock().catch((err) => {
            stderr.write("Error unlocking device: " + err + "\n");
            throw 1;
        });
    },
    chainable: true
});


export const bleDisable = new Command("Disable WiFi", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const ble = options["ble"] as string | undefined;
        const device = await getDevice(port, baudrate, socket, ble, env);

        await device.controller.lock().catch((err) => {
            stderr.write("Error locking device: " + err + "\n");
            throw 1;
        });

        await device.controller.configSetInt(BleKvNs.Main, BleKeys.Mode, BleMode.DISABLED);

        await device.controller.unlock().catch((err) => {
            stderr.write("Error unlocking device: " + err + "\n");
            throw 1;
        });

        stdout.write("Wifi config changed.\n");
    },
    chainable: true
});


export const bleEnableStream = new Command("Enable BLE stream mode", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const ble = options["ble"] as string | undefined;
        const device = await getDevice(port, baudrate, socket, ble, env);

        await device.controller.lock().catch((err) => {
            stderr.write("Error locking device: " + err + "\n");
            throw 1;
        });

        await device.controller.configSetInt(BleKvNs.Main, BleKeys.Mode, BleMode.ENABLED_STREAM);

        await device.controller.unlock().catch((err) => {
            stderr.write("Error unlocking device: " + err + "\n");
            throw 1;
        });

        stdout.write("Wifi config changed.\n");
    },
    chainable: true
});


export const bleSetName = new Command("Set BLE device name", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>, env: Env) => {
        const port = options["port"] as string;
        const baudrate = options["baudrate"] as string;
        const socket = options["socket"] as string;
        const ble = options["ble"] as string | undefined;

        const name = args["name"] as string | undefined;

        if (!name) {
            stderr.write("Name is required\n");
            throw 1;
        }

        if (name && name.length >= 20) {
            stderr.write("Name is too long\n");
            throw 1;
        }

        const device = await getDevice(port, baudrate, socket, ble, env);

        await device.controller.lock().catch((err) => {
            stderr.write("Error locking device: " + err + "\n");
            throw 1;
        });

        // TODO: Can we enable stream mode here?
        await device.controller.configSetInt(BleKvNs.Main, BleKeys.Mode, BleMode.ENABLED_STREAM);
        await device.controller.configSetString(BleKvNs.Main, BleKeys.Name, name);

        await device.controller.unlock().catch((err) => {
            stderr.write("Error unlocking device: " + err + "\n");
            throw 1;
        });

        stdout.write("Wifi config changed.\n");
    },
    args: [
        new Arg("name", "Name of the BLE device", { required: true }),
    ],
    chainable: true
});