function tableToString(table, options = {}) {
    const padding = options.padding ?? 2;
    const indent = options.indent ?? 0;
    const minWidths = options.minWidths ?? [];
    const columnWidths = [];
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
function getOptName(arg) {
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
function parseArgs(argv, base = {}, expOpts, expArgs) {
    let unknown = [];
    const options = { ...base };
    const argsList = [];
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
            if (opt.validator && !opt.validator(options[name])) {
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
    let args = {};
    for (let i = 0; i < expArgs.length; i++) {
        args[expArgs[i].name] = argsList[i];
    }
    return { options, args, unknown };
}
export class Opt {
    constructor(description, options = {}) {
        this.description = description;
        this.required = options.required ?? false;
        this.isFlag = options.isFlag ?? false;
        this.defaultValue = options.defaultValue;
        this.validator = options.validator;
    }
}
export class Arg {
    constructor(name, description, options = {}) {
        this.name = name;
        this.description = description;
        this.required = options.required ?? false;
        this.defaultValue = options.defaultValue;
        this.validator = options.validator;
    }
}
export class Command {
    constructor(brief, options = {}) {
        this.options = {};
        this.args = [];
        this.options = options.options ?? {};
        this.args = options.args ?? [];
        this.action = options.action;
        this.description = options.description;
        this.brief = brief;
    }
    help(command) {
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
        help += `${this.brief}\n\n`;
        if (this.description) {
            help += `${this.description}\n\n`;
        }
        let table = [];
        for (const [name, opt] of Object.entries(this.options)) {
            let desc = opt.description + (opt.defaultValue ? ` (default: ${opt.defaultValue})` : "");
            table.push([`--${name}`, desc]);
        }
        if (table.length > 0) {
            help += `Options:\n`;
            help += tableToString(table, { padding: 2, indent: 2, minWidths: [12] });
        }
        table = [];
        for (const arg of this.args) {
            let desc = arg.description + (arg.defaultValue ? ` (default: ${arg.defaultValue})` : "");
            table.push([arg.name, desc]);
        }
        if (table.length > 0) {
            help += `Arguments:\n`;
            help += tableToString(table, { padding: 2, indent: 2, minWidths: [12] });
        }
        return help;
    }
    async run(argv, globals) {
        const { options, args, unknown } = parseArgs(argv, globals, this.options, this.args);
        if (this.action) {
            await this.action(options, args);
        }
        return unknown;
    }
    validate(argv, globals) {
        const { options, args, unknown } = parseArgs(argv, globals, this.options, this.args);
        return unknown;
    }
}
export class Program {
    constructor(name, description, options = {}) {
        this.commands = {};
        this.globalOptions = {};
        this.name = name;
        this.description = description;
        this.globalOptions = options.globalOptions ?? {};
        this.action = options.action;
    }
    addCommand(name, command) {
        this.commands[name] = command;
    }
    getCommand(name) {
        return this.commands[name];
    }
    help() {
        let out = `Usage: ${this.name} <command>\n\n`;
        out += `${this.description}\n\n`;
        out += "Commands:\n";
        let table = [];
        for (const [name, command] of Object.entries(this.commands)) {
            table.push([name, command.brief]);
        }
        out += tableToString(table, { padding: 2, indent: 2, minWidths: [12] });
        out += "\nGlobal options:\n";
        table = [];
        for (const [name, opt] of Object.entries(this.globalOptions)) {
            let desc = opt.description + (opt.defaultValue ? ` (default: ${opt.defaultValue})` : "");
            table.push([`--${name}`, desc]);
        }
        out += tableToString(table, { padding: 2, indent: 2, minWidths: [12] });
        return out;
    }
    async run(argv, globals = {}, runAction = true) {
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
    validate(argv, globals = {}) {
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
    async chain(argv, globals = {}) {
        let { options, unknown } = parseArgs(argv, globals, this.globalOptions, []);
        this.validateChain(unknown, options);
        unknown = await this.run(unknown, options, true);
        while (unknown.length > 0) {
            unknown = await this.run(unknown, options, false);
        }
    }
    validateChain(argv, globals = {}) {
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
//# sourceMappingURL=command.js.map