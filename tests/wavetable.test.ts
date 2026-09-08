import { describe, expect, test } from "bun:test";
import { defaultPatch } from "../src/types.ts";
import { WasmBridge } from "../src/WasmBridge.ts";

const SAMPLE_RATE = 48000;
const WAVETABLE_ID = 7;

function peakAbs(pcm: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    peak = Math.max(peak, Math.abs(pcm[i] ?? 0));
  }
  return peak;
}

function makeWavetablePatch(wavetableId: number) {
  return defaultPatch({
    attack: 0,
    sustain: 0.1,
    decay: 0.1,
    waveform: "wavetable32",
    wavetableId,
    baseFrequency: 440,
  });
}

function makeFullScaleWavetable(): Uint8Array {
  const data = new Uint8Array(32);
  data.fill(255);
  return data;
}

describe("WasmBridge wavetable bindings", () => {
  test("registers 32-byte wavetable and renders non-silent PCM", async () => {
    const bridge = await WasmBridge.create();
    try {
      bridge.registerWavetable(WAVETABLE_ID, makeFullScaleWavetable());
      const pcm = bridge.render(makeWavetablePatch(WAVETABLE_ID), SAMPLE_RATE, 12345);

      expect(pcm.length).toBeGreaterThan(0);
      expect(peakAbs(pcm)).toBeGreaterThan(0.1);
    } finally {
      bridge.dispose();
    }
  });

  test("rejects invalid wavetable length", async () => {
    const bridge = await WasmBridge.create();
    try {
      expect(() => bridge.registerWavetable(WAVETABLE_ID, new Uint8Array(31))).toThrow(
        "wavetable data must be 32 bytes",
      );
      expect(() => bridge.registerWavetable(WAVETABLE_ID, new Uint8Array(33))).toThrow(
        "wavetable data must be 32 bytes",
      );
      expect(() => bridge.registerWavetable(-1, makeFullScaleWavetable())).toThrow(
        "wavetable id must be a non-negative integer",
      );
      expect(() => bridge.registerWavetable(1.5, makeFullScaleWavetable())).toThrow(
        "wavetable id must be a non-negative integer",
      );
    } finally {
      bridge.dispose();
    }
  });

  test("unregister and clear render safely as silence", async () => {
    const bridge = await WasmBridge.create();
    try {
      const patch = makeWavetablePatch(WAVETABLE_ID);
      bridge.registerWavetable(WAVETABLE_ID, makeFullScaleWavetable());
      expect(peakAbs(bridge.render(patch, SAMPLE_RATE, 1))).toBeGreaterThan(0.1);

      bridge.unregisterWavetable(WAVETABLE_ID);
      expect(peakAbs(bridge.render(patch, SAMPLE_RATE, 1))).toBeLessThan(1e-5);

      bridge.registerWavetable(WAVETABLE_ID, makeFullScaleWavetable());
      expect(peakAbs(bridge.render(patch, SAMPLE_RATE, 1))).toBeGreaterThan(0.1);

      bridge.clearWavetables();
      expect(peakAbs(bridge.render(patch, SAMPLE_RATE, 1))).toBeLessThan(1e-5);
    } finally {
      bridge.dispose();
    }
  });

  test("keeps copied wavetable data after JS mutation", async () => {
    const bridge = await WasmBridge.create();
    try {
      const data = makeFullScaleWavetable();
      bridge.registerWavetable(WAVETABLE_ID, data);
      const patch = makeWavetablePatch(WAVETABLE_ID);

      const before = bridge.render(patch, SAMPLE_RATE, 99);
      data.fill(0);
      const after = bridge.render(patch, SAMPLE_RATE, 99);

      expect(Array.from(before)).toEqual(Array.from(after));
      expect(peakAbs(after)).toBeGreaterThan(0.1);
    } finally {
      bridge.dispose();
    }
  });

  test("isolates wavetable banks across parallel engines", async () => {
    const [bridgeA, bridgeB] = await Promise.all([WasmBridge.create(), WasmBridge.create()]);
    try {
      bridgeA.registerWavetable(WAVETABLE_ID, makeFullScaleWavetable());
      const patch = makeWavetablePatch(WAVETABLE_ID);

      const pcmA = bridgeA.render(patch, SAMPLE_RATE, 42);
      const pcmB = bridgeB.render(patch, SAMPLE_RATE, 42);

      expect(peakAbs(pcmA)).toBeGreaterThan(0.1);
      expect(peakAbs(pcmB)).toBeLessThan(1e-5);
    } finally {
      bridgeA.dispose();
      bridgeB.dispose();
    }
  });

  test("existing sine waveform WASM render still works", async () => {
    const bridge = await WasmBridge.create();
    try {
      const patch = defaultPatch({
        attack: 0,
        sustain: 0.1,
        decay: 0.1,
        waveform: "sine",
        baseFrequency: 440,
      });
      const pcm = bridge.render(patch, SAMPLE_RATE, 1);

      expect(pcm.length).toBeGreaterThan(0);
      expect(peakAbs(pcm)).toBeGreaterThan(0.01);
    } finally {
      bridge.dispose();
    }
  });

  test("wavetable methods throw after dispose", async () => {
    const bridge = await WasmBridge.create();
    bridge.dispose();

    expect(() => bridge.registerWavetable(0, makeFullScaleWavetable())).toThrow("disposed");
    expect(() => bridge.unregisterWavetable(0)).toThrow("disposed");
    expect(() => bridge.clearWavetables()).toThrow("disposed");
  });
});
