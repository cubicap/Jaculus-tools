

export interface OutputStream {
    put(c: number): void
    write(buf: Buffer): void
}


export interface InputStream {
    onData(callback: (data: Buffer) => void): void
}


export interface Duplex extends OutputStream, InputStream {};
