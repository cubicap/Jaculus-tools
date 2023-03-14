# Jaculus-tools - Companion app/library for [Jaculus](https://github.com/cubicap/Jaculus)

Jaculus tools allow for uploading and downloading files, as well as controlling the
running Jaculus machine.

## Setup

First, install node.js and npm. Then, install the tools with:

    $ npm install -g https://github.com/cubicap/Jaculus-tools/archive/refs/heads/npm-publish.tar.gz

Then, you can run the tools using:

    $ jac

or

    $ npx jac

## Usage

To see the list of available commands, use:

    $ jac help

To see help for a specific command, use:

    $ jac help <command>

### Installing Jaculus to the device

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

Create a new TypeScript project, from the template provided in the `resources` directory. *Currently, `tsconfig.json` is not processed by the tools and serves only as reference for ide support.*

Compile the project to JavaScript:

    $ jac compile <file>

The output will be written to the `build` directory.

Flash the JavaScript program to the device (`<directory>` shoul point to the `build` directory):

    $ jac flash <directory>

To run the program, first stop the currently running program, then start the new one:

    $ jac stop
    $ jac start <entry-point.js>

If the file `/data/index.js` exists, it will be used as the entry point on device boot.

### Controlling the device and monitoring its output

To control the device, use the following commands:

    $ jac start <path>
    $ jac stop
    $ jac status
    $ jac monitor

# License

Everything in this repository, unless otherwise noted, is licensed under the
GNU General Public License, version 3.0.
