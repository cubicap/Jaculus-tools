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


    let sockets: Set<net.Socket> = new Set();

    let port = new SerialPort({
        path: portPath,
        baudRate: parseInt(options.baudrate)
    }, (err) => {
        if (err) {
            stdout.write("Port open error: " + err.message + "\n");
            process.exit(1);
        }

        port.set({
            rts: true,
            dtr: true
        })
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
        for (let socket of sockets) {
            socket.write(data);
        }
        stdout.write("Port >> " + data.toString() + "\n");
    });


    let server = net.createServer((socket) => {
        sockets.add(socket);

        socket.on("data", (data) => {
            stdout.write("Sock >> " + data.toString() + "\n");
            port.write(data);
        });
        socket.on("close", () => {
            sockets.delete(socket);
            stdout.write("Socket closed\n");
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
