declare function print(text: string): void;

declare module "stdio" {
    let stdout: Writable;
    let stderr: Writable;
    let stdin: Readable;
}
