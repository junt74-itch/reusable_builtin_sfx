import { describe, expect, test } from "bun:test";
import { createSfxEngine, KAMATA_WAVETABLE_NAMES, kamataWavetables, loadWavetable } from "../src/index.ts";

function peakAbs(pcm: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    peak = Math.max(peak, Math.abs(pcm[i] ?? 0));
  }
  return peak;
}

describe("kamata wavetables", () => {
  test("kamata.json contains 25 unique 32-sample tables", async () => {
    const json = (await Bun.file("wavetables/kamata.json").json()) as Record<string, unknown>;
    expect(Object.keys(json)).toEqual([...KAMATA_WAVETABLE_NAMES]);

    const signatures = new Set<string>();
    for (const name of KAMATA_WAVETABLE_NAMES) {
      const data = loadWavetable(json[name]);
      expect(data.length).toBe(32);
      signatures.add(Array.from(data).join(","));
    }
    expect(signatures.size).toBe(25);
  });

  test("kamataWavetables matches JSON and uses 4-bit expansion", () => {
    const tables = kamataWavetables();
    expect(Object.keys(tables)).toHaveLength(25);
    for (const name of KAMATA_WAVETABLE_NAMES) {
      const data = tables[name];
      expect(data.length).toBe(32);
      for (const sample of data) {
        expect(sample % 17).toBe(0);
      }
    }
  });

  test("createSfxEngine can render kamata wavetables", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    try {
      for (const name of ["kamata00", "kamata12", "kamata15"] as const) {
        const pcm = await engine.render(
          {
            version: 1,
            waveform: "wavetable32",
            wavetable: name,
            baseFrequency: 440,
            frequencySlide: 0,
            frequencyDeltaSlide: 0,
            attack: 0,
            sustain: 0.08,
            decay: 0.15,
            vibratoDepth: 0,
            vibratoSpeed: 0,
          },
          { seed: 0, sampleRate: 48000 },
        );
        expect(pcm.length).toBeGreaterThan(0);
        expect(peakAbs(pcm)).toBeGreaterThan(0.05);
      }
    } finally {
      engine.dispose();
    }
  });
});
