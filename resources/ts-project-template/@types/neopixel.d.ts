declare module "neopixel" {
    interface Rgb {
        r: number;
        g: number;
        b: number;
    }

    class Neopixel {
        constructor(pin: number, count: number);
        public show(): void;
        public set(index: number, rgb: Rgb): void;
        public get(index: number): Rgb;
    }
}
