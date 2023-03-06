export interface Consumer {
    processPacket(data: Buffer): void;
}

export interface Packet {
    put(c: number): boolean;
    space(): number;
    send(): void;
};

export const EOF = -1