import { Command } from "./lib/command.js";
import { stdout } from "process";
import { defaultPort } from "./util.js";
import * as net from "net";
import { SerialPort } from "serialport";

let cmd = new Command("Tunnel a serial port over a TCP socket", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let baudrate = options["baudrate"] as string;
        let socket = options["socket"] as string;
        let portPath = await defaultPort(options["port"] as string | undefined);

        stdout.write("Tunneling " + portPath + "\n");


        let sockets: Set<net.Socket> = new Set();

        let port = new SerialPort({
            path: portPath,
            baudRate: parseInt(baudrate)
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

        server.listen(socket, () => {
            stdout.write("Server listening on port " + socket + "\n");
        });

        return new Promise((resolve, reject) => {});
    }
});

export default cmd;
