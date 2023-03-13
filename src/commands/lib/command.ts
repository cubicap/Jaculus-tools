function tableToString(table: string[][], options: { padding?: number, indent?: number, minWidths?: [number] } = {}): string {
    const padding = options.padding ?? 2;
    const indent = options.indent ?? 0;
    const minWidths = options.minWidths ?? [];

    const columnWidths: number[] = [];

    let out = "";

    for (const row of table) {
        for (let i = 0; i < row.length; i++) {
            if (columnWidths[i] === undefined) {
                columnWidths[i] = minWidths[i] ?? 0;
            }

            columnWidths[i] = Math.max(columnWidths[i], row[i].length);
        }
    }

    for (const row of table) {
        out += " ".repeat(indent);
        for (let i = 0; i < row.length; i++) {
            out += row[i].padEnd(columnWidths[i] + padding);
        }

        out += "\n";
    }

    return out;
}

function getOptName(arg: string): string | null {
    if (!arg.startsWith("-")) {
        return null;
    }

    if (arg.startsWith("--")) {
        return arg.slice(2);
    }

    if (arg.startsWith("-") && arg.length === 2) {
        return arg.slice(1);
    }

    return null;
}

function parseArgs(
        argv: string[],
        base: Record<string, string | boolean> = {},
        expOpts: Record<string, Opt>,
        expArgs: Arg[]
    ): { options: Record<string, string | boolean>, args: Record<string, string>, unknown: string[] } {
    let unknown: string[] = [];

    const options: Record<string, string | boolean> = { ...base };
    const argsList: string[] = [];

    for (let i = 0; i < argv.length; i++) {
        const optName = getOptName(argv[i]);

        if (optName === null) {
            if (argsList.length < expArgs.length) {
                argsList.push(argv[i]);
            }
            else {
                unknown.push(argv[i]);
            }
            continue;
        }

        if (optName in expOpts) {

            if (optName in options) {
                throw new Error(`Option --${optName} was specified multiple times`);
            }

            if (expOpts[optName].isFlag) {
                options[optName] = true;
                continue;
            }

            if (i + 1 >= argv.length) {
                throw new Error(`Option --${optName} requires a value`);
            }

            options[optName] = argv[i + 1];
            i++;
            continue;
        }
        else if (argsList.length < expArgs.length) {
            throw new Error(`Unknown option ${optName}`);
        }

        unknown.push(argv[i]);
    }

    for (const [name, opt] of Object.entries(expOpts)) {
        if (name in options) {
            if (opt.validator && !opt.validator(options[name] as string)) {
                throw new Error(`Option ${name} has an invalid value`);
            }
            continue;
        }

        if (opt.isFlag) {
            options[name] = false;
            continue;
        }
        if (opt.defaultValue !== undefined) {
            options[name] = opt.defaultValue;
            continue;
        }

        if (opt.required) {
            throw new Error(`Option ${name} is required`);
        }
    }

    for (let [i, arg] of expArgs.entries()) {
        if (i < argsList.length) {
            if (arg.validator && !arg.validator(argsList[i])) {
                throw new Error(`Argument ${arg.name} has an invalid value`);
            }
            continue;
        }

        if (arg.defaultValue !== undefined) {
            argsList[i] = arg.defaultValue;
            continue;
        }

        if (arg.required) {
            throw new Error(`Argument ${arg.name} is required`);
        }
    }

    let args: Record<string, string> = {};
    for (let i = 0; i < expArgs.length; i++) {
        args[expArgs[i].name] = argsList[i];
    }

    return { options, args, unknown };
}


export class Opt {
    public description: string;
    public required: boolean;
    public isFlag: boolean;
    public defaultValue?: string;
    public validator?: (value: string) => boolean;

    constructor(description: string, options: { required?: boolean, isFlag?: boolean, defaultValue?: string, validator?: (value: string) => boolean } = {}) {
        this.description = description;
        this.required = options.required ?? false;
        this.isFlag = options.isFlag ?? false;
        this.defaultValue = options.defaultValue;
        this.validator = options.validator;
    }
}


export class Arg {
    public name: string;
    public description: string;
    public required: boolean;
    public defaultValue?: string;
    public validator?: (value: string) => boolean;

    constructor(name: string, description: string, options: { required?: boolean, defaultValue?: string, validator?: (value: string) => boolean } = {}) {
        this.name = name;
        this.description = description;
        this.required = options.required ?? false;
        this.defaultValue = options.defaultValue;
        this.validator = options.validator;
    }
}


export class Command {
    private options: Record<string, Opt> = {};
    public description: string;
    private args: Arg[] = [];
    private action?: (options: Record<string, string | boolean>, args: Record<string, string>) => Promise<void>;

    constructor(description: string, options: { options?: Record<string, Opt>, args?: Arg[], action?: (options: Record<string, string | boolean>, args: Record<string, string>) => Promise<void> } = {}) {
        this.options = options.options ?? {};
        this.args = options.args ?? [];
        this.action = options.action;

        this.description = description;
    }

    public help(command: string): string {
        let args = "";
        for (const arg of this.args) {
            if (arg.required) {
                args += ` <${arg.name}>`;
            }
            else {
                args += ` [${arg.name}]`;
            }
        }
        let help = `Usage: ${command} [OPTIONS]${args}\n\n`;
        help += `${this.description}\n\n`;

        let table = [];
        for (const [name, opt] of Object.entries(this.options)) {
            table.push([`--${name}`, opt.description]);
        }
        if (table.length > 0) {
            help += `Options:\n`;
            help += tableToString(table, { padding: 2, indent: 2 });
        }

        table = [];
        for (const arg of this.args) {
            table.push([arg.name, arg.description]);
        }
        if (table.length > 0) {
            help += `Arguments:\n`;
            help += tableToString(table, { padding: 2, indent: 2 });
        }

        return help;
    }


    public async run(argv: string[], globals: Record<string, string | boolean>): Promise<string[]> {
        const { options, args, unknown } = parseArgs(argv, globals, this.options, this.args);

        if (this.action) {
            await this.action(options, args);
        }

        return unknown;
    }

    public validate(argv: string[], globals: Record<string, string | boolean>): string[] {
        const { options, args, unknown } = parseArgs(argv, globals, this.options, this.args);

        return unknown;
    }
}


export class Program {
    private commands: Record<string, Command> = {};
    private name: string;
    private description: string;
    private globalOptions: Record<string, Opt> = {};
    private action?: (options: Record<string, string | boolean>) => Promise<void>;

    constructor(name: string, description: string, options: { globalOptions?: Record<string, Opt>, action?: (options: Record<string, string | boolean>) => Promise<void> } = {}) {
        this.name = name;
        this.description = description;
        this.globalOptions = options.globalOptions ?? {};
        this.action = options.action;
    }

    public addCommand(name: string, command: Command): void {
        this.commands[name] = command;
    }

    public getCommand(name: string): Command | undefined {
        return this.commands[name];
    }

    public help(): string {
        let out = `Usage: ${this.name} <command>\n\n`;
        out += `${this.description}\n\n`;

        out += "Commands:\n";
        let table: string[][] = [];
        for (const [name, command] of Object.entries(this.commands)) {
            table.push([name, command.description]);
        }
        out += tableToString(table, { padding: 2, indent: 2, minWidths: [12] });

        out += "\nGlobal options:\n";
        table = [];
        for (const [name, opt] of Object.entries(this.globalOptions)) {
            table.push([`--${name}`, opt.description]);
        }
        out += tableToString(table, { padding: 2, indent: 2 });

        return out;
    }

    public async run(argv: string[], globals: Record<string, string | boolean> = {}, runAction: boolean = true): Promise<string[]> {

        if (runAction && this.action) {
            await this.action(globals);
        }

        if (argv.length === 0) {
            this.help();
            return [];
        }

        const commandName = argv[0];
        const command = this.commands[commandName];

        if (command === undefined) {
            this.help();
            return [];
        }

        return command.run(argv.slice(1), globals);
    }

    public validate(argv: string[], globals: Record<string, string | boolean> = {}): void {
        let { options, unknown } = parseArgs(argv, globals, this.globalOptions, []);

        if (unknown.length === 0) {
            return;
        }

        const commandName = unknown[0];
        const command = this.commands[commandName];

        if (command === undefined) {
            throw new Error(`Unknown command ${commandName}`);
        }

        command.validate(unknown.slice(1), globals);
    }


    public async chain(argv: string[], globals: Record<string, string | boolean> = {}): Promise<void> {
        let { options, unknown } = parseArgs(argv, globals, this.globalOptions, []);

        this.validateChain(unknown, options);

        unknown = await this.run(unknown, options, true);

        while (unknown.length > 0) {
            unknown = await this.run(unknown, options, false);
        }
    }

    public validateChain(argv: string[], globals: Record<string, string | boolean> = {}): void {
        let { options, unknown } = parseArgs(argv, globals, this.globalOptions, []);

        if (unknown.length === 0) {
            return;
        }

        while (unknown.length > 0) {
            const commandName = unknown[0];
            const command = this.commands[commandName];

            if (command === undefined) {
                if (commandName.startsWith("-")) {
                    throw new Error(`Unknown option ${commandName}`);
                }
                else {
                    throw new Error(`Unknown command ${commandName}`);
                }
            }

            unknown = command.validate(unknown.slice(1), globals);
        }
    }
}
