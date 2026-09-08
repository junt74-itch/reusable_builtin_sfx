import { globSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { emccEnv, emxxPath, findEmsdkRoot } from "./emsdk.ts";

const repoRoot = join(import.meta.dir, "..");
const outputJs = join(repoRoot, "generated", "sfx_synth.mjs");

mkdirSync(dirname(outputJs), { recursive: true });

const emsdkRoot = findEmsdkRoot();
const emxx = emxxPath(emsdkRoot);

const sources = [
  join(repoRoot, "wasm", "bindings.cpp"),
  ...globSync("core/src/*.cpp", { cwd: repoRoot }).map((rel) => join(repoRoot, rel)),
];

const args = [
  ...sources,
  "-std=c++17",
  "-O2",
  "-fno-exceptions",
  "-fno-rtti",
  `-I${join(repoRoot, "core", "include")}`,
  "-sMODULARIZE=1",
  "-sEXPORT_ES6=1",
  "-sEXPORT_NAME=createSfxWasmModule",
  "-sENVIRONMENT=web",
  "-sSINGLE_FILE=1",
  "-sALLOW_MEMORY_GROWTH=1",
  "-sFILESYSTEM=0",
  "-sEXPORTED_FUNCTIONS=_create_context,_destroy_context,_render_patch,_register_wavetable,_unregister_wavetable,_clear_wavetables,_malloc,_free",
  "-sEXPORTED_RUNTIME_METHODS=HEAPF32,HEAP32,HEAPU8",
  "-o",
  outputJs,
];

const result = Bun.spawnSync([emxx, ...args], {
  cwd: repoRoot,
  env: emccEnv(emsdkRoot),
  stdout: "inherit",
  stderr: "inherit",
});

if (result.exitCode !== 0) {
  throw new Error(`em++ failed with exit code ${result.exitCode}`);
}

console.log(`wasm written: ${outputJs}`);
