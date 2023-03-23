declare function setInterval(callback: () => void, ms: number): number;
declare function setTimeout(callback: () => void, ms: number): number;
declare function clearTimeout(id: number): void;
declare function clearInterval(id: number): void;
declare function sleep(ms: number): Promise<void>;
