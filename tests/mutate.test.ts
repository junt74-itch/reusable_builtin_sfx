import { describe, expect, test } from "bun:test";
import { mutatePatch, validatePatch } from "../src/index.ts";
import { BUILTIN_PRESET_NAMES, builtinPresets } from "../src/presets.ts";
import { defaultPatch } from "../src/types.ts";

const base = defaultPatch({
  waveform: "saw",
  baseFrequency: 330,
  frequencySlide: 4,
  attack: 0,
  sustain: 0.03,
  decay: 0.08,
});

describe("mutatePatch", () => {
  test("amount 0 returns a validated copy equal to the input", () => {
    const mutated = mutatePatch(base, { amount: 0, seed: 99 });
    expect(mutated).toEqual(validatePatch(base));
    expect(mutated).not.toBe(base);
  });

  test("same base + amount + seed yields the same patch", () => {
    const first = mutatePatch(base, { amount: 0.45, seed: 12345 });
    const second = mutatePatch(base, { amount: 0.45, seed: 12345 });
    expect(first).toEqual(second);
  });

  test("different seeds yield different patches", () => {
    const first = mutatePatch(base, { amount: 1, seed: 1 });
    const second = mutatePatch(base, { amount: 1, seed: 2 });
    expect(first).not.toEqual(second);
  });

  test("always returns a patch that validatePatch accepts", () => {
    const presets = builtinPresets();
    for (const name of BUILTIN_PRESET_NAMES) {
      const preset = presets[name];
      if (!preset) {
        throw new Error(`missing preset: ${name}`);
      }
      for (const seed of [0, 1, 7, 99, 0xffff_ffff]) {
        const mutated = mutatePatch(preset, { amount: 1, seed });
        expect(validatePatch(mutated)).toEqual(mutated);
        expect(mutated.waveform).toBe(preset.waveform);
        expect(mutated.version).toBe(1);
      }
    }
  });

  test("low amount keeps inactive optional fields off", () => {
    const mutated = mutatePatch(base, { amount: 0.2, seed: 3 });
    expect(mutated.vibratoDepth).toBe(0);
    expect(mutated.vibratoSpeed).toBe(0);
    expect(mutated.lowPassCutoff ?? 1).toBe(1);
    expect(mutated.highPassCutoff ?? 0).toBe(0);
  });

  test("rejects non-finite amount and seed", () => {
    expect(() => mutatePatch(base, { amount: Number.NaN })).toThrow("amount");
    expect(() => mutatePatch(base, { seed: Number.POSITIVE_INFINITY })).toThrow("seed");
  });

  test("clamps amount into 0..1", () => {
    expect(mutatePatch(base, { amount: -1, seed: 4 })).toEqual(validatePatch(base));
    const clamped = mutatePatch(base, { amount: 8, seed: 4 });
    const atOne = mutatePatch(base, { amount: 1, seed: 4 });
    expect(clamped).toEqual(atOne);
  });
});
