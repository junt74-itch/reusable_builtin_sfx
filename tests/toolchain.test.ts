import { describe, expect, test } from "bun:test";
import { createSfxEngine, defaultPatch, SFX_PACKED_FLOAT_COUNT, packPatch } from "../src/index.ts";

const expectedDuration = 0.2;

describe("wasm toolchain", () => {
  test("render returns Float32 PCM of envelope duration", async () => {
    const sfx = await createSfxEngine({ sampleRate: 48000 });
    const patch = defaultPatch({ attack: 0, sustain: 0.1, decay: 0.1, waveform: "sine" });
    const pcm = await sfx.render(patch, { seed: 1, sampleRate: 48000 });

    expect(pcm).toBeInstanceOf(Float32Array);
    expect(Math.abs(pcm.length / 48000 - expectedDuration)).toBeLessThan(0.002);
    expect(packPatch(patch).length).toBe(SFX_PACKED_FLOAT_COUNT);

    const again = await sfx.render(patch, { seed: 1, sampleRate: 48000 });
    expect(Array.from(pcm)).toEqual(Array.from(again));

    sfx.dispose();
    await expect(sfx.render(patch)).rejects.toThrow("disposed");
  });
});
