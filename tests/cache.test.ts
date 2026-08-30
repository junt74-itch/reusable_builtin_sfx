import { describe, expect, test } from "bun:test";
import { makeCacheKey, PcmCache } from "../src/cache.ts";
import { createSfxEngineFromParts, type PcmRenderer } from "../src/SfxEngine.ts";
import { defaultPatch, type SfxPatchV1 } from "../src/types.ts";
import { WasmBridge } from "../src/WasmBridge.ts";

class CountingRenderer implements PcmRenderer {
  renderCount = 0;

  constructor(private readonly inner: WasmBridge) {}

  render(patch: SfxPatchV1, sampleRate: number, seed: number): Float32Array {
    this.renderCount++;
    return this.inner.render(patch, sampleRate, seed);
  }

  dispose(): void {
    this.inner.dispose();
  }
}

describe("PcmCache", () => {
  test("makeCacheKey includes name, seed, and sampleRate", () => {
    expect(makeCacheKey("ui.select", 7, 48000)).toBe("ui.select|7|48000");
    expect(makeCacheKey("ui.select", 7, 44100)).not.toBe(makeCacheKey("ui.select", 7, 48000));
  });
});

describe("SfxEngine cache", () => {
  test("uses cache for preset names and skips second WASM render", async () => {
    const wasm = await WasmBridge.create();
    const counter = new CountingRenderer(wasm);
    const engine = createSfxEngineFromParts(
      counter,
      undefined,
      48000,
      { "ui.select": defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05 }) },
    );

    const first = await engine.render("ui.select", { seed: 7, sampleRate: 48000 });
    const second = await engine.render("ui.select", { seed: 7, sampleRate: 48000 });

    expect(counter.renderCount).toBe(1);
    expect(Array.from(first)).toEqual(Array.from(second));

    engine.dispose();
  });

  test("clearCache forces a new WASM render", async () => {
    const wasm = await WasmBridge.create();
    const counter = new CountingRenderer(wasm);
    const engine = createSfxEngineFromParts(
      counter,
      undefined,
      48000,
      { "ui.select": defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05 }) },
    );

    await engine.render("ui.select", { seed: 7, sampleRate: 48000 });
    expect(counter.renderCount).toBe(1);

    engine.clearCache();
    await engine.render("ui.select", { seed: 7, sampleRate: 48000 });
    expect(counter.renderCount).toBe(2);

    engine.dispose();
  });

  test("different sampleRate uses different cache entries", async () => {
    const wasm = await WasmBridge.create();
    const counter = new CountingRenderer(wasm);
    const engine = createSfxEngineFromParts(
      counter,
      undefined,
      48000,
      { "ui.select": defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05 }) },
    );

    await engine.render("ui.select", { seed: 0, sampleRate: 48000 });
    await engine.render("ui.select", { seed: 0, sampleRate: 44100 });
    expect(counter.renderCount).toBe(2);

    engine.dispose();
  });

  test("preload stores preset at seed 0 and current sampleRate", async () => {
    const wasm = await WasmBridge.create();
    const counter = new CountingRenderer(wasm);
    const engine = createSfxEngineFromParts(
      counter,
      undefined,
      48000,
      { "ui.select": defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05 }) },
    );

    await engine.preload(["ui.select"]);
    expect(counter.renderCount).toBe(1);

    await engine.render("ui.select", { seed: 0, sampleRate: 48000 });
    expect(counter.renderCount).toBe(1);

    engine.dispose();
  });

  test("patch objects bypass cache", async () => {
    const wasm = await WasmBridge.create();
    const counter = new CountingRenderer(wasm);
    const engine = createSfxEngineFromParts(counter, undefined, 48000, {});
    const patch = defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05 });

    await engine.render(patch, { seed: 1, sampleRate: 48000 });
    await engine.render(patch, { seed: 1, sampleRate: 48000 });
    expect(counter.renderCount).toBe(2);

    engine.dispose();
  });

  test("cache is cleared on dispose", async () => {
    const cache = new PcmCache();
    cache.set("a", new Float32Array([1]));
    cache.clear();
    expect(cache.has("a")).toBe(false);
  });
});
