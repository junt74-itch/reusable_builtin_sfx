import { describe, expect, test } from "bun:test";
import { createSfxEngine, defaultPatch } from "../src/index.ts";

describe("golden deterministic", () => {
  test("render is identical across two calls", async () => {
    const sfx = await createSfxEngine({ sampleRate: 48000 });
    const patch = defaultPatch({
      attack: 0,
      sustain: 0.05,
      decay: 0.05,
      waveform: "sine",
      baseFrequency: 440,
      masterVolume: 0.5,
    });

    const pcm = await sfx.render(patch, { seed: 12345, sampleRate: 48000 });
    const again = await sfx.render(patch, { seed: 12345, sampleRate: 48000 });

    expect(Array.from(again)).toEqual(Array.from(pcm));
    expect(pcm.slice(0, 16)).toEqual(again.slice(0, 16));

    sfx.dispose();
  });

  test("noise output differs when seed changes", async () => {
    const sfx = await createSfxEngine({ sampleRate: 48000 });
    const patch = defaultPatch({
      attack: 0,
      sustain: 0.05,
      decay: 0.05,
      waveform: "noise",
      baseFrequency: 440,
      masterVolume: 0.5,
    });

    const seed_a = await sfx.render(patch, { seed: 12345, sampleRate: 48000 });
    const seed_b = await sfx.render(patch, { seed: 54321, sampleRate: 48000 });
    const seed_a_again = await sfx.render(patch, { seed: 12345, sampleRate: 48000 });

    expect(Array.from(seed_a)).not.toEqual(Array.from(seed_b));
    expect(Array.from(seed_a_again)).toEqual(Array.from(seed_a));

    sfx.dispose();
  });
});
