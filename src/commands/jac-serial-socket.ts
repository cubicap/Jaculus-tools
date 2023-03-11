import { Command, OptionValues } from "commander";
import { defaultPort, defaultSocket, defaultBaudrate } from "./util.js";
import * as net from "net";
import { SerialPort } from "serialport";
import { stdout } from "process";

const program = new Command();

program
    .option("-p, --port [path]", "Serial port to use (default: first available)")
    .option("-b, --baudrate [baudrate]", "Baudrate to use", defaultBaudrate())
    .option("-s, --socket [port]", "Port to listen on", defaultSocket());


program.action(async (options: OptionValues) => {
    let portPath = await defaultPort(options.port);

    stdout.write("Tunneling " + portPath + "\n");


    let socket: net.Socket | null = null;

    let port = new SerialPort({
        path: portPath,
        baudRate: parseInt(options.baudrate),
        autoOpen: false
    });

    port.on("error", (err) => {
        stdout.write("Port error: " + err.message + "\n");
        process.exit(1);
    });

    port.on("close", () => {
        stdout.write("Port closed\n");
        process.exit(0);
    });

    port.on("data", (data) => {
        if (socket) {
            socket.write(data);
        }
        stdout.write("Port data: " + data.toString() + "\n");
    });

    port.open();


    let server = net.createServer((newSocket) => {
        if (socket) {
            newSocket.end();
            return;
        }

        socket = newSocket;
        socket.on("data", (data) => {
            stdout.write("Socket data: " + data.toString() + "\n");
            port.write(data);
        });
        socket.on("close", () => {
            socket = null;
        });
        socket.on("error", (err) => {
            stdout.write("Socket error: " + err.message + "\n");
        });
    });

    server.on("close", () => {
        stdout.write("Server closed\n");
    });

    server.on("error", (err) => {
        stdout.write("Server error: " + err.message + "\n");
        process.exit(1);
    });

    server.listen(options.socket, () => {
        stdout.write("Server listening on port " + options.socket + "\n");
    });
});

program.parse(process.argv);
