export interface OutputStream {
    put(c: number): void
    write(buf: Buffer): void

    onEnd(callback?: () => void): void
    onError(callback?: (err: any) => void): void

    destroy(): void
}


export interface InputStream {
    onData(callback?: (data: Buffer) => void): void
    onEnd(callback?: () => void): void
    onError(callback?: (err: any) => void): void

    destroy(): void
}


export interface Duplex extends OutputStream, InputStream {};
