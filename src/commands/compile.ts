import { Command, Arg } from "./lib/command.js";
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


let cmd = new Command("List files in a directory", {
    action: async (options: Record<string, string | boolean>, args: Record<string, string>) => {
        let path_ = args["path"] as string;

        let parentDir = path.dirname(path_);
        let outDir = path.join(parentDir, "build");

        let dts = listDts(path.join(parentDir, "@types"));

        compile([path_, ...dts], outDir);
    },
    args: [
        new Arg("path", "File to compile", { required: true }),
    ]
});

export default cmd;
