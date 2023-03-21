declare interface Writable {
    print(...args: any[]): void;
    println(...args: any[]): void;
}

declare interface Readable {
    readline(): string;
}
