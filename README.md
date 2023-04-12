# Jaculus-tools - Companion app/library for [Jaculus](https://github.com/cubicap/Jaculus)

Jaculus tools allow for uploading and downloading files, as well as controlling the
running Jaculus machine.

## Setup

First, install node.js and npm. Then, install jaculus-tools with:

    $ npm install -g jaculus-tools

Then, you can run the tools using:

    $ jac

or

    $ npx jac

## Usage

To see the list of available commands, use:

    $ jac help

To see help for a specific command, use:

    $ jac help <command>

To connect to the device using serial port, correct driver must be installed - most likely [CP210x USB to UART Bridge](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers).

### Installing Jaculus to the device

On Windows, this step requires Python 3 and git to be installed

On Linux, this step requires python3, python3-venv, git, cmake

To install Jaculus to the device, use:

    $ jac install --port <port> --platform <platform>

You can specify existing ESP-IDF installation using `--idf` option (requires ESP-IDF version 5.0):

    $ jac install --port <port> --platform <platform> --idf <path>

### Connecting to the device

All commands interacting with the device require specifying the device connection using either `--port` or `--socket` option.

To connect to the device using serial port, use:

    $ jac --port <port> <command>

To connect to the device using TCP socket, use:

    $ jac --socket <host>:<port> <command>

To list available serial ports, use:

    $ jac list-ports

To tunnel serial port over TCP, use:

    $ jac serial-socket --port <port> --socket <port>

### Creating and running TypeScript programs

Create a new TypeScript project, from the template provided in the `resources` directory.

Compile the project to JavaScript:

    $ jac build

The output will be written to the `build` directory.

Flash the JavaScript program to the device:

    $ jac flash

After flashing, the program will be immediately executed on the device.

The entry point of the program is the `index.ts` file in the root of the project.

### Creating and running JavaScript programs

Create a directory for your source files.

Flash the JavaScript program to the device (`<path>` should point to the source directory):

    $ jac flash --from <path>

After flashing, the program will be immediately executed on the device.

The entry point of the program is the `index.js` file in the source directory.

### Controlling the device and monitoring its output

To control the device, use the following commands:

    $ jac start <path>
    $ jac stop
    $ jac status
    $ jac monitor

# License

Everything in this repository, unless otherwise noted, is licensed under the
GNU General Public License, version 3.0.
