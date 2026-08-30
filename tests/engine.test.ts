import { describe, expect, test } from "bun:test";
import * as publicApi from "../src/index.ts";
import {
  BUILTIN_PRESET_NAMES,
  createSfxEngine,
  defaultPatch,
  loadPresets,
  mergePresets,
  type SfxEngine,
} from "../src/index.ts";
import { builtinPresets } from "../src/presets.ts";

const allowedValueExports = [
  "createSfxEngine",
  "validatePatch",
  "defaultPatch",
  "BUILTIN_PRESET_NAMES",
  "builtinPresets",
  "loadPresets",
  "mergePresets",
  "SFX_WAVEFORMS",
] as const;

const forbiddenPublicExports = [
  "SfxWasmInstance",
  "WasmBridge",
  "createSfxEngineFromParts",
  "PcmRenderer",
  "PcmCache",
  "makeCacheKey",
  "AudioBackend",
  "HEAPF32",
  "HEAP32",
  "_malloc",
  "_free",
  "_render_patch",
  "_create_context",
  "createSfxWasmModule",
  "packPatch",
  "PACKED_PATCH_FIELD_ORDER",
  "SFX_PACKED_FLOAT_COUNT",
];

describe("SfxEngine public API", () => {
  test("render works without AudioContext", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    const pcm = await engine.render("ui.select", { seed: 0, sampleRate: 48000 });

    expect(pcm).toBeInstanceOf(Float32Array);
    expect(pcm.length).toBeGreaterThan(0);

    engine.dispose();
  });

  test("preload and clearCache work without AudioContext", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });

    await engine.preload(["ui.select", "player.jump"]);
    engine.clearCache();

    const pcm = await engine.render("ui.select", { seed: 0, sampleRate: 48000 });
    expect(pcm.length).toBeGreaterThan(0);

    engine.dispose();
  });

  test("dispose prevents further render", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    engine.dispose();
    await expect(engine.render("ui.select")).rejects.toThrow("disposed");
  });

  test("play requires AudioContext", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    await expect(engine.play("ui.select")).rejects.toThrow("AudioContext is not available");
    engine.dispose();
  });

  test("unknown preset name throws", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    await expect(engine.render("missing.preset")).rejects.toThrow("unknown preset");
    engine.dispose();
  });

  test("createSfxEngine merges builtin presets with overrides", async () => {
    const override = loadPresets({
      "ui.select": defaultPatch({ waveform: "square", baseFrequency: 1200, sustain: 0.01, decay: 0.02 }),
      "mod.custom": defaultPatch({ waveform: "triangle", baseFrequency: 300 }),
    });
    const engine = await createSfxEngine({
      sampleRate: 48000,
      audioContext: undefined,
      presets: override,
    });
    const baseline = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });

    const builtin = await engine.render("ui.cancel", { seed: 1, sampleRate: 48000 });
    const overridden = await engine.render("ui.select", { seed: 1, sampleRate: 48000 });
    const custom = await engine.render("mod.custom", { seed: 1, sampleRate: 48000 });
    const defaultSelect = await baseline.render("ui.select", { seed: 1, sampleRate: 48000 });

    expect(builtin.length).toBeGreaterThan(0);
    expect(overridden.length).toBeGreaterThan(0);
    expect(custom.length).toBeGreaterThan(0);
    expect(Array.from(overridden)).not.toEqual(Array.from(defaultSelect));

    engine.dispose();
    baseline.dispose();
  });

  test("all builtin preset names are available", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });

    for (const name of BUILTIN_PRESET_NAMES) {
      const pcm = await engine.render(name, { seed: 0, sampleRate: 48000 });
      expect(pcm.length).toBeGreaterThan(0);
    }

    engine.dispose();
  });

  test("render returns an independent PCM copy", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    const patch = defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05, waveform: "sine" });

    const first = await engine.render("ui.select", { seed: 7, sampleRate: 48000 });
    const snapshot = Array.from(first);
    first[0] = 999;

    const second = await engine.render("ui.select", { seed: 7, sampleRate: 48000 });
    expect(Array.from(second)).toEqual(snapshot);

    const patchFirst = await engine.render(patch, { seed: 3, sampleRate: 48000 });
    const patchSnapshot = Array.from(patchFirst);
    patchFirst[0] = -999;

    const patchSecond = await engine.render(patch, { seed: 3, sampleRate: 48000 });
    expect(Array.from(patchSecond)).toEqual(patchSnapshot);

    engine.dispose();
  });

  test("SfxEngine exposes the planned methods", async () => {
    const engine: SfxEngine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });

    expect(typeof engine.play).toBe("function");
    expect(typeof engine.render).toBe("function");
    expect(typeof engine.preload).toBe("function");
    expect(typeof engine.clearCache).toBe("function");
    expect(typeof engine.setMasterVolume).toBe("function");
    expect(typeof engine.dispose).toBe("function");

    engine.dispose();
  });

  test("public exports expose game-facing API only", () => {
    for (const name of allowedValueExports) {
      expect(name in publicApi).toBe(true);
    }

    for (const name of forbiddenPublicExports) {
      expect(name in publicApi).toBe(false);
    }

    expect(Object.keys(publicApi).sort()).toEqual([...allowedValueExports].sort());
  });

  test("mergePresets helper matches engine override behavior", () => {
    const merged = mergePresets(builtinPresets(), loadPresets({ "ui.select": defaultPatch({ baseFrequency: 999 }) }));
    expect(merged["ui.select"]?.baseFrequency).toBe(999);
    expect(merged["ui.cancel"]?.version).toBe(1);
  });
});

function createMockAudioContext() {
  const destination = { kind: "destination", connectedTo: [] as unknown[] };
  const nodes = {
    master: null as { gain: { value: number }; connectedTo: unknown[]; connect(d: unknown): unknown } | null,
    gains: [] as { gain: { value: number }; connectedTo: unknown[]; connect(d: unknown): unknown }[],
    panners: [] as { pan: { value: number }; connectedTo: unknown[]; connect(d: unknown): unknown }[],
  };

  const context = {
    state: "running" as AudioContextState,
    sampleRate: 48000,
    destination,
    createGain() {
      const node = {
        kind: "gain",
        gain: { value: 1 },
        connectedTo: [] as unknown[],
        connect(destination: unknown) {
          this.connectedTo.push(destination);
          return destination;
        },
        disconnect() {
          this.connectedTo.length = 0;
        },
      };
      nodes.gains.push(node);
      return node as unknown as GainNode;
    },
    createStereoPanner() {
      const node = {
        kind: "panner",
        pan: { value: 0 },
        connectedTo: [] as unknown[],
        connect(destination: unknown) {
          this.connectedTo.push(destination);
          return destination;
        },
        disconnect() {
          this.connectedTo.length = 0;
        },
      };
      nodes.panners.push(node);
      return node as unknown as StereoPannerNode;
    },
    createBufferSource() {
      const node = {
        buffer: null as AudioBuffer | null,
        connectedTo: [] as unknown[],
        connect(destination: unknown) {
          node.connectedTo.push(destination);
          return destination;
        },
        start() {},
      };
      return node as unknown as AudioBufferSourceNode;
    },
    createBuffer(_channels: number, length: number, _sampleRate: number) {
      return {
        length,
        getChannelData: () => new Float32Array(length),
      } as unknown as AudioBuffer;
    },
    async resume() {
      context.state = "running";
    },
    async close() {
      context.state = "closed";
    },
  };

  return { context: context as unknown as AudioContext, nodes };
}

describe("SfxEngine volume, pan, and dispose safety", () => {
  test("dispose blocks play, preload, setMasterVolume, clearCache, and render", async () => {
    const { context } = createMockAudioContext();
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: context });
    engine.dispose();

    await expect(engine.play("ui.select")).rejects.toThrow("disposed");
    await expect(engine.preload(["ui.select"])).rejects.toThrow("disposed");
    expect(() => engine.setMasterVolume(0.5)).toThrow("disposed");
    expect(() => engine.clearCache()).toThrow("disposed");
    await expect(engine.render("ui.select")).rejects.toThrow("disposed");
  });

  test("dispose is idempotent", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    engine.dispose();
    engine.dispose();
  });

  test("setMasterVolume clamps to 0..1 on master gain", async () => {
    const { context, nodes } = createMockAudioContext();
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: context });
    const master = nodes.gains[0] as { gain: { value: number } };

    engine.setMasterVolume(-0.5);
    expect(master.gain.value).toBe(0);

    engine.setMasterVolume(1.5);
    expect(master.gain.value).toBe(1);

    engine.setMasterVolume(0.25);
    expect(master.gain.value).toBe(0.25);

    engine.dispose();
  });

  test("play clamps per-voice volume and pan independently of master volume", async () => {
    const { context, nodes } = createMockAudioContext();
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: context });

    engine.setMasterVolume(0.5);
    await engine.play("ui.select", { volume: -2, pan: 3 });

    const master = nodes.gains[0] as { gain: { value: number } };
    const voiceGain = nodes.gains[1] as { gain: { value: number } };
    const panner = nodes.panners[0] as { pan: { value: number } };

    expect(master.gain.value).toBe(0.5);
    expect(voiceGain.gain.value).toBe(0);
    expect(panner.pan.value).toBe(1);

    engine.dispose();
  });
});
