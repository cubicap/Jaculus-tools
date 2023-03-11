import { Duplex } from "./stream.js"
import * as net from "net"

export class SocketStream implements Duplex {
    private callbacks: {
        "data": (data: Buffer) => void,
        "error": (err: any) => void,
    }

    private socket: net.Socket

    constructor(host: string, port: number, callbacks: {
        "data"?: (data: Buffer) => void,
        "error"?: (err: any) => void
    } = {}) {
        this.callbacks = {
            "data": callbacks["data"] || ((data: Buffer) => {}),
            "error": callbacks["error"] || ((err: any) => {})
        }

        let socket = new net.Socket()
        socket.setTimeout(1000)

        socket.on("data", (data: Buffer) => {
            this.callbacks["data"](data)
        })

        socket.on("error", (err: any) => {
            this.callbacks["error"](err)
        })

        socket.on("close", () => {
            this.callbacks["error"]("Socket closed")
        })

        socket.connect(port, host)
        this.socket = socket
    }


    put(c: number): void {
        this.socket.write(Buffer.from([c]))
    }
    write(buf: Buffer): void {
        let bufCopy = Buffer.from(buf)
        this.socket.write(bufCopy)
    }

    public onData(callback: (data: Buffer) => void): void {
        this.callbacks["data"] = callback
    }
}
