import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "dist");
const skipDirs = new Set([".git", ".agents", ".codex", "dist", "node_modules", "scripts"]);

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  sourceMap: false
};

async function findTypeScriptFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        await findTypeScriptFiles(absolutePath, files);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function transpileFile(sourcePath) {
  const source = await readFile(sourcePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: sourcePath,
    reportDiagnostics: true
  });

  const errors = result.diagnostics?.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );

  if (errors?.length) {
    const message = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => rootDir,
      getNewLine: () => "\n"
    });
    throw new Error(message);
  }

  const relativePath = path.relative(rootDir, sourcePath).replace(/\.ts$/, ".js");
  const outputPath = path.join(outDir, relativePath);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.outputText, "utf8");
}

await rm(outDir, { recursive: true, force: true });

const files = await findTypeScriptFiles(rootDir);
await Promise.all(files.map(transpileFile));

console.log(`Built ${files.length} TypeScript files into dist/`);
