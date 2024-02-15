import { Arg, Command } from "./lib/command.js";
import { stderr } from "process";
import { getDevice } from "./util.js";
import fs from "fs";
import * as tar from "tar-stream";
import * as zlib from "zlib";
import path from "path";
const cmd = new Command("Get example project from device", {
    action: async (options, args, env) => {
        const port = options["port"];
        const baudrate = options["baudrate"];
        const socket = options["socket"];
        const path_ = args["path"];
        const device = await getDevice(port, baudrate, socket, env);
        await device.controller.lock().catch((err) => {
            stderr.write("Error locking device: " + err + "\n");
            throw 1;
        });
        const data = await device.uploader.readResource("ts-examples").catch((err) => {
            stderr.write("Error: " + err + "\n");
            throw 1;
        });
        await device.controller.unlock().catch((err) => {
            stderr.write("Error unlocking device: " + err + "\n");
            throw 1;
        });
        const extract = tar.extract();
        await new Promise((resolve, reject) => {
            extract.on("entry", (header, stream, next) => {
                if (header.type !== "file") {
                    next();
                    return;
                }
                const chunks = [];
                stream.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                stream.on("end", () => {
                    const data = Buffer.concat(chunks);
                    const outpath = path.join(path_, header.name);
                    const dir = path.dirname(outpath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    fs.writeFileSync(outpath, data);
                    next();
                });
                stream.on("error", (err) => {
                    reject(err);
                });
            });
            extract.on("finish", () => {
                resolve(null);
            });
            extract.on("error", (err) => {
                reject(err);
            });
            const gunzip = zlib.createGunzip();
            gunzip.pipe(extract);
            gunzip.write(data);
            gunzip.end();
        });
    },
    args: [
        new Arg("path", "Name of the resource", { required: true }),
    ],
    chainable: true
});
export default cmd;
//# sourceMappingURL=get-examples.js.map