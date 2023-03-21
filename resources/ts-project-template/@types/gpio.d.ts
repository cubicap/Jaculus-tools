declare module "gpio" {
    const PinMode: {
        DISABLE: number,
        OUTPUT: number,
        INPUT: number,
        INPUT_PULLUP: number,
        INPUT_PULLDOWN: number,
    };

    function pinMode(pin: number, mode: number): void;
    function write(pin: number, value: number): void;
    function read(pin: number): number;

    function on(event: "rising" | "falling" | "change", pin: number, callback: () => void): void;
    function off(event: "rising" | "falling" | "change", pin: number): void;
}
