import { describe, expect, test } from "bun:test";
import { createSfxEngine, defaultPatch } from "../src/index.ts";
import { createSfxEngineFromParts, type PcmRenderer } from "../src/SfxEngine.ts";
import { WasmBridge } from "../src/WasmBridge.ts";

const SAMPLE_RATE = 48000;

function peakAbs(pcm: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    peak = Math.max(peak, Math.abs(pcm[i] ?? 0));
  }
  return peak;
}

function makeWavetablePatch(wavetable: string) {
  return defaultPatch({
    attack: 0,
    sustain: 0.1,
    decay: 0.1,
    waveform: "wavetable32",
    wavetable,
    baseFrequency: 440,
  });
}

function makeFullScaleWavetable(): Uint8Array {
  const data = new Uint8Array(32);
  data.fill(255);
  return data;
}

function makeHalfScaleWavetable(): Uint8Array {
  const data = new Uint8Array(32);
  data.fill(128);
  return data;
}

class CountingRenderer implements PcmRenderer {
  renderCount = 0;

  constructor(private readonly inner: WasmBridge) {}

  render(...args: Parameters<PcmRenderer["render"]>): Float32Array {
    this.renderCount++;
    return this.inner.render(...args);
  }

  registerWavetable(id: number, data: Uint8Array): void {
    this.inner.registerWavetable(id, data);
  }

  unregisterWavetable(id: number): void {
    this.inner.unregisterWavetable(id);
  }

  clearWavetables(): void {
    this.inner.clearWavetables();
  }

  dispose(): void {
    this.inner.dispose();
  }
}

class BasicRenderer implements PcmRenderer {
  constructor(private readonly inner: WasmBridge) {}

  render(...args: Parameters<PcmRenderer["render"]>): Float32Array {
    return this.inner.render(...args);
  }

  dispose(): void {
    this.inner.dispose();
  }
}

describe("SfxEngine wavetable API", () => {
  test("renders after registering a named wavetable", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });
    engine.registerWavetable("bell", makeFullScaleWavetable());

    const pcm = await engine.render(makeWavetablePatch("bell"), { seed: 123, sampleRate: SAMPLE_RATE });
    expect(pcm.length).toBeGreaterThan(0);
    expect(peakAbs(pcm)).toBeGreaterThan(0.1);

    engine.dispose();
  });

  test("rejects invalid wavetable length", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });

    expect(() => engine.registerWavetable("bell", new Uint8Array(31))).toThrow(
      "wavetable data must be 32 bytes",
    );
    expect(() => engine.registerWavetable("bell", new Uint8Array(33))).toThrow(
      "wavetable data must be 32 bytes",
    );

    engine.dispose();
  });

  test("failed register does not leave a stale name mapping", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });

    expect(() => engine.registerWavetable("bell", new Uint8Array(31))).toThrow(
      "wavetable data must be 32 bytes",
    );

    await expect(
      engine.render(makeWavetablePatch("bell"), { seed: 0, sampleRate: SAMPLE_RATE }),
    ).rejects.toThrow("unknown wavetable: bell");

    engine.dispose();
  });

  test("re-registering the same name overwrites data at the same id", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });
    const patch = makeWavetablePatch("bell");

    engine.registerWavetable("bell", makeFullScaleWavetable());
    const first = await engine.render(patch, { seed: 1, sampleRate: SAMPLE_RATE });

    engine.registerWavetable("bell", makeHalfScaleWavetable());
    const second = await engine.render(patch, { seed: 1, sampleRate: SAMPLE_RATE });

    expect(Array.from(first)).not.toEqual(Array.from(second));

    engine.dispose();
  });

  test("unregister and clear remove wavetable audio", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });
    const patch = makeWavetablePatch("bell");

    engine.registerWavetable("bell", makeFullScaleWavetable());
    expect(peakAbs(await engine.render(patch, { seed: 1, sampleRate: SAMPLE_RATE }))).toBeGreaterThan(0.1);

    engine.unregisterWavetable("bell");
    await expect(engine.render(patch, { seed: 1, sampleRate: SAMPLE_RATE })).rejects.toThrow(
      "unknown wavetable: bell",
    );

    engine.registerWavetable("bell", makeFullScaleWavetable());
    expect(peakAbs(await engine.render(patch, { seed: 1, sampleRate: SAMPLE_RATE }))).toBeGreaterThan(0.1);

    engine.clearWavetables();
    await expect(engine.render(patch, { seed: 1, sampleRate: SAMPLE_RATE })).rejects.toThrow(
      "unknown wavetable: bell",
    );

    engine.dispose();
  });

  test("throws on unknown wavetable name during render", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });

    await expect(
      engine.render(makeWavetablePatch("missing"), { seed: 0, sampleRate: SAMPLE_RATE }),
    ).rejects.toThrow("unknown wavetable: missing");

    engine.dispose();
  });

  test("wavetable32 without a registered name renders silently", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });
    const patch = defaultPatch({
      attack: 0,
      sustain: 0.1,
      decay: 0.1,
      waveform: "wavetable32",
      baseFrequency: 440,
    });

    const pcm = await engine.render(patch, { seed: 0, sampleRate: SAMPLE_RATE });
    expect(pcm.length).toBeGreaterThan(0);
    expect(peakAbs(pcm)).toBeLessThan(1e-5);

    engine.dispose();
  });

  test("prefers wavetable name over wavetableId", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });
    engine.registerWavetable("bell", makeFullScaleWavetable());

    const named = await engine.render(makeWavetablePatch("bell"), { seed: 5, sampleRate: SAMPLE_RATE });
    const byId = await engine.render(
      defaultPatch({
        attack: 0,
        sustain: 0.1,
        decay: 0.1,
        waveform: "wavetable32",
        wavetable: "bell",
        wavetableId: 999,
        baseFrequency: 440,
      }),
      { seed: 5, sampleRate: SAMPLE_RATE },
    );

    expect(Array.from(named)).toEqual(Array.from(byId));

    engine.dispose();
  });

  test("registering a wavetable clears preset cache", async () => {
    const wasm = await WasmBridge.create();
    const counter = new CountingRenderer(wasm);
    const engine = createSfxEngineFromParts(counter, undefined, SAMPLE_RATE, {
      "test.bell": makeWavetablePatch("bell"),
    });

    engine.registerWavetable("bell", makeFullScaleWavetable());
    await engine.render("test.bell", { seed: 0, sampleRate: SAMPLE_RATE });
    expect(counter.renderCount).toBe(1);

    engine.registerWavetable("bell", makeHalfScaleWavetable());
    await engine.render("test.bell", { seed: 0, sampleRate: SAMPLE_RATE });
    expect(counter.renderCount).toBe(2);

    engine.dispose();
  });

  test("registerWavetable throws when renderer lacks support", async () => {
    const wasm = await WasmBridge.create();
    const engine = createSfxEngineFromParts(new BasicRenderer(wasm), undefined, SAMPLE_RATE, {});

    expect(() => engine.registerWavetable("bell", makeFullScaleWavetable())).toThrow(
      "renderer does not support registerWavetable",
    );

    engine.dispose();
  });

  test("numeric wavetable ids pass through to the renderer", async () => {
    const engine = await createSfxEngine({ sampleRate: SAMPLE_RATE, audioContext: undefined });
    const numericId = 42;

    engine.registerWavetable(numericId, makeFullScaleWavetable());
    const pcm = await engine.render(
      defaultPatch({
        attack: 0,
        sustain: 0.1,
        decay: 0.1,
        waveform: "wavetable32",
        wavetableId: numericId,
        baseFrequency: 440,
      }),
      { seed: 7, sampleRate: SAMPLE_RATE },
    );

    expect(peakAbs(pcm)).toBeGreaterThan(0.1);

    engine.dispose();
  });
});
