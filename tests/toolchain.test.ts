import { describe, expect, test } from "bun:test";
import { createSfxEngine, defaultPatch } from "../src/index.ts";
import { packPatch, SFX_PACKED_FLOAT_COUNT } from "../src/types.ts";
import * as publicApi from "../src/index.ts";
import { WasmBridge } from "../src/WasmBridge.ts";

const expectedDuration = 0.2;
const forbiddenPublicExports = [
  "SfxWasmInstance",
  "WasmBridge",
  "HEAPF32",
  "HEAP32",
  "_malloc",
  "_free",
  "_render_patch",
  "_create_context",
  "createSfxWasmModule",
];

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

  test("sampleRate 0 returns empty PCM", async () => {
    const wasm = await WasmBridge.create();
    const patch = defaultPatch({ attack: 0, sustain: 0.1, decay: 0.1, waveform: "sine" });

    const pcm = wasm.render(patch, 0, 1);
    expect(pcm).toBeInstanceOf(Float32Array);
    expect(pcm.length).toBe(0);

    const viaEngine = await createSfxEngine({ sampleRate: 48000 });
    const enginePcm = await viaEngine.render(patch, { seed: 1, sampleRate: 0 });
    expect(enginePcm.length).toBe(0);

    wasm.dispose();
    viaEngine.dispose();
  });

  test("invalid packed length is handled safely in WASM", async () => {
    expect(await WasmBridge.probeInvalidPackedLength()).toBe(true);
  });

  test("public exports do not expose Emscripten symbols", () => {
    for (const name of forbiddenPublicExports) {
      expect(name in publicApi).toBe(false);
    }
  });
});

describe("WasmBridge isolation", () => {
  test("parallel engines use independent contexts", async () => {
    const [engineA, engineB] = await Promise.all([
      createSfxEngine({ sampleRate: 48000 }),
      createSfxEngine({ sampleRate: 48000 }),
    ]);

    const patch = defaultPatch({
      attack: 0,
      sustain: 0.05,
      decay: 0.05,
      waveform: "noise",
      baseFrequency: 440,
    });

    const [pcmA, pcmB] = await Promise.all([
      engineA.render(patch, { seed: 111, sampleRate: 48000 }),
      engineB.render(patch, { seed: 222, sampleRate: 48000 }),
    ]);

    expect(pcmA.length).toBeGreaterThan(0);
    expect(pcmB.length).toBeGreaterThan(0);
    expect(Array.from(pcmA)).not.toEqual(Array.from(pcmB));

    engineA.dispose();
    engineB.dispose();

    await expect(engineA.render(patch)).rejects.toThrow("disposed");
    await expect(engineB.render(patch)).rejects.toThrow("disposed");
  });

  test("WasmBridge cannot render after dispose", async () => {
    const bridge = await WasmBridge.create();
    const patch = defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05, waveform: "sine" });

    bridge.render(patch, 48000, 1);
    bridge.dispose();

    expect(() => bridge.render(patch, 48000, 1)).toThrow("disposed");
  });
});
