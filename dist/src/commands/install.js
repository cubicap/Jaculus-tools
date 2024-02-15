import { Command, Opt } from "./lib/command.js";
import { loadPackage } from "../distribution/package.js";
import { stderr, stdout } from "process";
const cmd = new Command("Install Jaculus to device", {
    action: async (options) => {
        const pkgPath = options["package"];
        const port = options["port"];
        const info = options["info"];
        if (!port && !info) {
            stderr.write("Port not specified\n");
            throw 1;
        }
        stderr.write("Loading package...\n");
        const pkg = await loadPackage(pkgPath);
        stdout.write("Version: " + pkg.getManifest().getVersion() + "\n");
        stdout.write("Board: " + pkg.getManifest().getBoard() + "\n");
        stdout.write("Platform: " + pkg.getManifest().getPlatform() + "\n");
        stdout.write("\n");
        if (info) {
            stdout.write(pkg.info());
        }
        else {
            await pkg.flash(port);
        }
    },
    args: [],
    options: {
        "package": new Opt("Uri pointing to the package file", { required: true }),
        "info": new Opt("Show package info", { isFlag: true })
    },
    chainable: false
});
export default cmd;
//# sourceMappingURL=install.js.map