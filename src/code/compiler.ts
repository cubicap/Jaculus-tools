import { stdout } from "process";
import ts from "typescript";

export function compile(fileNames: string[], outDir: string): boolean {
    let options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ES2020,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        sourceMap: true,
        resolveJsonModule: true,
        esModuleInterop: true,
        outDir: outDir,
    };

    let program = ts.createProgram(fileNames, options);
    let emitResult = program.emit();

    let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            stdout.write(`${diagnostic.file.fileName} (${line + 1},${character + 1}): `);
            stdout.write(diagnostic.messageText + "\n");
        }
        else {
            console.log(diagnostic.messageText + "\n");
        }
    });

    return emitResult.emitSkipped;
}
