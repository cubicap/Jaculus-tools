# Jaculus-tools - Companion application/library for Jaculus

Jaculus tools allow for uploading and downloading files, as well as controlling the
running Jaculus runtime on the device.

## Setup

First, install node.js and npm. Then, install jaculus-tools with:

    npm install -g jaculus-tools

Then, you can run the tools using:

    jac

or

    npx jac

## Usage

To see the list of available commands, use:

    jac help

To see help for a specific command, use:

    jac help <command>

To connect to the device using serial port, the correct driver must be installed - most likely [CP210x USB to UART Bridge](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers).

### Installing Jaculus firmware to the device

First, the Jaculus runtime must be installed on the device.

The runtime can be installed using the following command:

    jac install --package <package.tar.gz> --port <port>

The command will download the selected package and install it on the device (packages can be found on the [downloads page](https://f.jaculus.org)). The package info can be viewed using the `--info` flag.

Verify that the runtime is installed correctly by running:

    jac version


### Connecting to the device

All commands interacting with the device require specifying the device connection using USB `--port`, `--socket` or `--ble` options.

To connect to the device using serial port, use:

    jac --port <port> <command>

To connect to the device using TCP socket, use:

    jac --socket <host>:<port> <command>

To connect to the device using Bluetooth Low Energy, use:

    jac --ble <device-name> <command>

To list available serial ports, use:

    jac list-ports

To list available Bluetooth devices, use:
    jac list-ble

To tunnel serial port over TCP, use:

    jac serial-socket --port <port> --socket <port>


### Creating and running TypeScript programs

Create a new TypeScript project. A template project for ESP32 with examples is available on [GitHub](https://github.com/cubicap/Jaculus-esp32/tree/master/ts-examples).

Compile the project to JavaScript:

    jac build

The output will be written to the `build` directory.

Flash the JavaScript program to the device:

    jac flash

After flashing, the program will be immediately executed on the device.

The entry point of the program is the `index.ts` file at the root of the project.


### Creating and running JavaScript programs

Create a directory for your source files.

Flash the JavaScript program to the device (`<path>` should point to the source directory):

    jac flash --from <path>

After flashing, the program will be immediately executed on the device.

The entry point of the program is the `index.js` file in the source directory.


### Controlling the device and monitoring its output

To control the device, use the following commands:

    jac start <path>
    jac stop
    jac status
    jac monitor


## Updating the firmware

To update the firmware, just install the new runtime package using the `install` command.

Note that this will erase all data stored on the device. It may be also necessary to update the type definitions for the runtime. They can be found in the example project on [GitHub](https://github.com/cubicap/Jaculus-esp32/tree/master/ts-examples).


# License

Everything in this repository, unless otherwise noted, is licensed under the
GNU General Public License, version 3.0.
