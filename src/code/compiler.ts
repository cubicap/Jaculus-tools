import { stderr } from "process";
import { Writable } from "stream";
import ts from "typescript";

function printMessage(message: string | ts.DiagnosticMessageChain, stream: Writable = stderr, indent = 0) {
    if (typeof message === "string") {
        stream.write(" ".repeat(indent * 2) + message + "\n");
    }
    else {
        stream.write(" ".repeat(indent * 2) + message.messageText + "\n");
        if (message.next) {
            for (let next of message.next) {
                printMessage(next, stream, indent + 1);
            }
        }
    }
}

export function compile(fileNames: string[], outDir: string, err: Writable = stderr): boolean {
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
            printMessage(`${diagnostic.file.fileName} (${line + 1},${character + 1}): `);
            printMessage(diagnostic.messageText);
        }
        else {
            printMessage(diagnostic.messageText);
        }
    });

    return emitResult.emitSkipped;
}
