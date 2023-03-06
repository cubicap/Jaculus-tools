import { SerialPort } from "serialport"
import { PortInfo } from "@serialport/bindings-cpp"
import { Duplex } from "./link/stream.js"


export class SerialStream implements Duplex {
    path: string
    baudRate: number
    callbacks: {
        "data": (data: Buffer) => void,
        "overflow": (data: Buffer) => void,
        "error": (err: any) => void,
    }
    port: SerialPort

    constructor(path: string, options: any) {
        this.path = path
        this.baudRate = options.baudRate || 115200
        this.callbacks = {
            "data": options.data || function() {},
            "overflow": options.overflow || function() {},
            "error": options.error || function() {},
        }

        this.port = new SerialPort({
                path: this.path,
                baudRate: this.baudRate
            }, (err) => {
                if (err) {
                    throw err
                }

                this.port.set({
                    rts: true,
                    dtr: true
                })
            }
        )
        this.port.on("data", (data) => {
            this.callbacks["data"](data)
        })

        this.port.on("overflow", (data) => {
            this.callbacks["overflow"](data)
        })

        this.port.on("error", (err) => {
            this.callbacks["error"](err)
        })
    }

    put(c: number): void {
        this.port.write(c)
    }
    write(buf: Buffer): void {
        let bufCopy = Buffer.from(buf)
        this.port.write(bufCopy)
    }

    public onData(callback: (data: Buffer) => void): void {
        this.callbacks["data"] = callback
    }

    static list(): Promise<PortInfo[]> {
        return SerialPort.list()
    }
}
