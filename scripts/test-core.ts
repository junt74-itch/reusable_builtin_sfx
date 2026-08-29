import { globSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const outDir = join(repoRoot, "tmp");
mkdirSync(outDir, { recursive: true });

const exeName = process.platform === "win32" ? "test_core.exe" : "test_core";
const output = join(outDir, exeName);

const compiler =
  process.platform === "win32"
    ? (Bun.which("g++") ?? "C:\\msys64\\ucrt64\\bin\\g++.exe")
    : (Bun.which("clang++") ?? Bun.which("g++") ?? "c++");

const sources = [
  join(repoRoot, "core", "tests", "test_runner.cpp"),
  ...globSync("core/src/*.cpp", { cwd: repoRoot }).map((rel) => join(repoRoot, rel)),
];

const args = [
  "-std=c++17",
  "-O0",
  "-g",
  `-I${join(repoRoot, "core", "include")}`,
  "-o",
  output,
  ...sources,
];

const compile = Bun.spawnSync([compiler, ...args], {
  cwd: repoRoot,
  stdout: "inherit",
  stderr: "inherit",
});

if (compile.exitCode !== 0) {
  throw new Error(`${compiler} failed with exit code ${compile.exitCode}`);
}

const run = Bun.spawnSync([output], {
  cwd: repoRoot,
  stdout: "inherit",
  stderr: "inherit",
});

if (run.exitCode !== 0) {
  throw new Error(`core tests failed with exit code ${run.exitCode}`);
}
