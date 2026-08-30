import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mutatePatch, validatePatch } from "../src/index.ts";

const repoRoot = join(import.meta.dir, "..");
const cliPath = join(repoRoot, "scripts", "sfx-cli.ts");
const presetPath = join(repoRoot, "presets", "ui.select.json");

function runCli(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(["bun", cliPath, "mutate", ...args], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

describe("sfx mutate CLI", () => {
  test("same input and seeds yield the same JSON on stdout", () => {
    const first = runCli([presetPath, "--count", "3", "--seed", "42"]);
    const second = runCli([presetPath, "--count", "3", "--seed", "42"]);

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(first.stdout).toBe(second.stdout);

    const parsed = JSON.parse(first.stdout) as unknown[];
    expect(parsed).toHaveLength(3);

    const base = validatePatch(JSON.parse(readFileSync(presetPath, "utf8")));
    expect(parsed[0]).toEqual(mutatePatch(base, { amount: 0.45, seed: 42 }));
    expect(parsed[1]).toEqual(mutatePatch(base, { amount: 0.45, seed: 43 }));
    expect(parsed[2]).toEqual(mutatePatch(base, { amount: 0.45, seed: 44 }));
  });

  test("writes numbered JSON files with --out", () => {
    const outDir = mkdtempSync(join(tmpdir(), "sfx-mutate-"));
    try {
      const result = runCli([presetPath, "--count", "2", "--out", outDir]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");

      const first = readFileSync(join(outDir, "ui.select-0001.json"), "utf8");
      const second = readFileSync(join(outDir, "ui.select-0002.json"), "utf8");
      const base = validatePatch(JSON.parse(readFileSync(presetPath, "utf8")));
      expect(JSON.parse(first)).toEqual(mutatePatch(base, { amount: 0.45, seed: 0 }));
      expect(JSON.parse(second)).toEqual(mutatePatch(base, { amount: 0.45, seed: 1 }));
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  test("rejects broken JSON with non-zero exit", () => {
    const badPath = join(repoRoot, "presets", "does-not-exist.json");
    const result = runCli([badPath, "--count", "1"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("sfx mutate:");
  });

  test("rejects invalid patch JSON with non-zero exit", () => {
    const badPath = mkdtempSync(join(tmpdir(), "sfx-bad-patch-"));
    const filePath = join(badPath, "bad.json");
    try {
      writeFileSync(
        filePath,
        JSON.stringify({
          version: 1,
          waveform: "laser",
          baseFrequency: 440,
          frequencySlide: 0,
          frequencyDeltaSlide: 0,
          attack: 0,
          sustain: 0.01,
          decay: 0.01,
          vibratoDepth: 0,
          vibratoSpeed: 0,
        }),
        "utf8",
      );
      const result = runCli([filePath, "--count", "1"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("waveform");
    } finally {
      rmSync(badPath, { recursive: true, force: true });
    }
  });
});
