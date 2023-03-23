import { Command, Opt } from "./lib/command.js";
import path from "path";
import { compile } from "../code/compiler.js";
import * as fs from "fs";


function listDts(dir: string): string[] {
    let dts: string[] = [];
    for (let file of fs.readdirSync(dir)) {
        if (fs.lstatSync(path.join(dir, file)).isDirectory()) {
            dts = dts.concat(listDts(path.join(dir, file)));
        }
        else if (file.endsWith(".d.ts")) {
            dts.push(path.join(dir, file));
        }
    }
    return dts;
}


let cmd = new Command("Compile target file", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let path_ = options["input"] as string;

        let parentDir = path.dirname(path_);
        let outDir = path.join(parentDir, "build");

        compile(path_, outDir);
    },
    options: {
        "input": new Opt("The input directory", { required: true, defaultValue: "./" }),
    },
    chainable: true
});

export default cmd;
