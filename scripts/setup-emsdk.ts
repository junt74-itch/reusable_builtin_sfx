import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { PINNED_EMSDK_VERSION } from "./emsdk.ts";

const target = process.env["EMSDK"] || (process.platform === "win32" ? "C:\\source\\emsdk" : join(homedir(), "emsdk"));

function run(cmd: string[], cwd: string): void {
  const result = Bun.spawnSync(cmd, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`command failed (${result.exitCode}): ${cmd.join(" ")}`);
  }
}

if (!existsSync(join(target, "emsdk.py"))) {
  run(["git", "clone", "https://github.com/emscripten-core/emsdk.git", target], repoCwd());
}

const emsdk = process.platform === "win32" ? join(target, "emsdk.bat") : join(target, "emsdk");
run([emsdk, "install", PINNED_EMSDK_VERSION], target);
run([emsdk, "activate", PINNED_EMSDK_VERSION], target);
console.log(`Emscripten ${PINNED_EMSDK_VERSION} is ready at ${target}`);

function repoCwd(): string {
  return join(import.meta.dir, "..");
}
