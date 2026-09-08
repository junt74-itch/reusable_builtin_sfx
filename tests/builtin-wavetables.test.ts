import { describe, expect, test } from "bun:test";
import { createSfxEngine } from "../src/index.ts";
import {
  BUILTIN_WAVETABLE_NAMES,
  builtinWavetables,
  loadWavetable,
} from "../src/wavetables.ts";
import { BUILTIN_PRESET_NAMES, builtinPresets } from "../src/presets.ts";

const ORIGINAL_PRESET_NAMES = [
  "ui.select",
  "ui.cancel",
  "ui.confirm",
  "item.pickup",
  "item.coin",
  "player.jump",
  "player.damage",
  "enemy.hit",
  "weapon.shot",
  "explosion.basic",
  "powerup",
  "warning",
] as const;

const WAVETABLE_PRESET_NAMES = [
  "wavetable.sineish",
  "wavetable.metallic",
  "wavetable.hollow",
] as const;

function peakAbs(pcm: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    peak = Math.max(peak, Math.abs(pcm[i] ?? 0));
  }
  return peak;
}

describe("builtin wavetables", () => {
  test("wavetable JSON files contain 32 samples", async () => {
    for (const name of BUILTIN_WAVETABLE_NAMES) {
      const json = await Bun.file(`wavetables/${name}.json`).json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBe(32);
    }
  });

  test("loadWavetable rejects invalid lengths", () => {
    expect(() => loadWavetable(new Array(31).fill(128))).toThrow(/32 samples/);
    expect(() => loadWavetable(new Array(33).fill(128))).toThrow(/32 samples/);
  });

  test("loadWavetable rejects non-array input", () => {
    expect(() => loadWavetable({ samples: new Array(32).fill(128) })).toThrow(/expected array/);
  });

  test("loadWavetable rejects out-of-range samples", () => {
    const samples = new Array(32).fill(128);
    samples[0] = 256;
    expect(() => loadWavetable(samples)).toThrow(/sample 0/);

    samples[0] = -1;
    expect(() => loadWavetable(samples)).toThrow(/sample 0/);
  });

  test("builtinWavetables returns 32-byte tables for all names", () => {
    const wavetables = builtinWavetables();
    for (const name of BUILTIN_WAVETABLE_NAMES) {
      expect(wavetables[name]).toBeInstanceOf(Uint8Array);
      expect(wavetables[name]?.length).toBe(32);
    }
  });

  test("wavetable demo presets validate", () => {
    const presets = builtinPresets();
    for (const name of WAVETABLE_PRESET_NAMES) {
      const patch = presets[name];
      expect(patch?.version).toBe(1);
      expect(patch?.waveform).toBe("wavetable32");
      expect(patch?.wavetable).toBe(name.slice("wavetable.".length));
    }
  });

  test("createSfxEngine renders wavetable demo presets with audible output", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });

    for (const name of WAVETABLE_PRESET_NAMES) {
      const pcm = await engine.render(name, { seed: 0, sampleRate: 48000 });
      expect(pcm.length).toBeGreaterThan(0);
      expect(peakAbs(pcm)).toBeGreaterThan(0.1);
    }

    engine.dispose();
  });

  test("existing 12 presets still validate and render", async () => {
    const presets = builtinPresets();
    for (const name of ORIGINAL_PRESET_NAMES) {
      expect(presets[name]?.version).toBe(1);
    }

    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    for (const name of ORIGINAL_PRESET_NAMES) {
      const pcm = await engine.render(name, { seed: 0, sampleRate: 48000 });
      expect(pcm.length).toBeGreaterThan(0);
      expect(peakAbs(pcm)).toBeGreaterThan(0.01);
    }

    engine.dispose();
  });

  test("builtin preset list includes wavetable demos", () => {
    expect(BUILTIN_PRESET_NAMES.length).toBeGreaterThanOrEqual(15);
    for (const name of WAVETABLE_PRESET_NAMES) {
      expect(BUILTIN_PRESET_NAMES).toContain(name);
    }
  });
});
