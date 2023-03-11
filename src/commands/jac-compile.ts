import { Command, OptionValues } from "commander";
import path from "path";
import { compile } from "../code/compiler.js";
import * as fs from "fs";

const program = new Command();

program
    .argument("<path>", "Directory to main.ts");


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


program.action(async (path_: string) => {
    let parentDir = path.dirname(path_);
    let outDir = path.join(parentDir, "build");

    let dts = listDts(path.join(parentDir, "@types"));

    compile([path_, ...dts], outDir);
});

program.parse(process.argv);
