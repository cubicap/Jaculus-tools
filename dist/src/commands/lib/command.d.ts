export declare class Opt {
    description: string;
    required: boolean;
    isFlag: boolean;
    defaultValue?: string;
    validator?: (value: string) => boolean;
    constructor(description: string, options?: {
        required?: boolean;
        isFlag?: boolean;
        defaultValue?: string;
        validator?: (value: string) => boolean;
    });
}
export declare class Arg {
    name: string;
    description: string;
    required: boolean;
    defaultValue?: string;
    validator?: (value: string) => boolean;
    constructor(name: string, description: string, options?: {
        required?: boolean;
        defaultValue?: string;
        validator?: (value: string) => boolean;
    });
}
export declare class Command {
    private options;
    brief: string;
    description?: string;
    private args;
    private action?;
    constructor(brief: string, options?: {
        options?: Record<string, Opt>;
        args?: Arg[];
        action?: (options: Record<string, string | boolean>, args: Record<string, string>) => Promise<void>;
        description?: string;
    });
    help(command: string): string;
    run(argv: string[], globals: Record<string, string | boolean>): Promise<string[]>;
    validate(argv: string[], globals: Record<string, string | boolean>): string[];
}
export declare class Program {
    private commands;
    private name;
    private description;
    private globalOptions;
    private action?;
    constructor(name: string, description: string, options?: {
        globalOptions?: Record<string, Opt>;
        action?: (options: Record<string, string | boolean>) => Promise<void>;
    });
    addCommand(name: string, command: Command): void;
    getCommand(name: string): Command | undefined;
    help(): string;
    run(argv: string[], globals?: Record<string, string | boolean>, runAction?: boolean): Promise<string[]>;
    validate(argv: string[], globals?: Record<string, string | boolean>): void;
    chain(argv: string[], globals?: Record<string, string | boolean>): Promise<void>;
    validateChain(argv: string[], globals?: Record<string, string | boolean>): void;
}
//# sourceMappingURL=command.d.ts.map