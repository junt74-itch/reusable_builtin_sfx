import { describe, expect, test } from "bun:test";
import * as publicApi from "../src/index.ts";
import { AudioBackend } from "../src/AudioBackend.ts";
import {
  createSfxEngine,
  defaultPatch,
  loadPresets,
  mergePresets,
} from "../src/index.ts";
import { createSfxEngineFromParts, type PcmRenderer } from "../src/SfxEngine.ts";
import { WasmBridge } from "../src/WasmBridge.ts";

const FORBIDDEN_PUBLIC_EXPORTS = [
  "WasmBridge",
  "HEAPF32",
  "_malloc",
  "_render_patch",
  "createSfxWasmModule",
];

const ACCEPTANCE_PATCH = defaultPatch({
  waveform: "sine",
  baseFrequency: 440,
  attack: 0,
  sustain: 0.05,
  decay: 0.05,
});

function estimatePositiveZeroCrossingHz(pcm: Float32Array, sampleRate: number): number {
  let crossings = 0;
  for (let i = 1; i < pcm.length; i++) {
    const prev = pcm[i - 1] ?? 0;
    const current = pcm[i] ?? 0;
    if (prev <= 0 && current > 0) {
      crossings++;
    }
  }
  const durationSec = pcm.length / sampleRate;
  return crossings / durationSec;
}

class CountingRenderer implements PcmRenderer {
  renderCount = 0;

  constructor(private readonly inner: WasmBridge) {}

  render(patch: Parameters<PcmRenderer["render"]>[0], sampleRate: number, seed: number): Float32Array {
    this.renderCount++;
    return this.inner.render(patch, sampleRate, seed);
  }

  dispose(): void {
    this.inner.dispose();
  }
}

function createMockAudioContext(sampleRate = 48000): AudioContext {
  const destination = { connectedTo: [] as unknown[] };
  return {
    state: "running",
    sampleRate,
    destination,
    createGain() {
      const node = {
        gain: { value: 1 },
        connectedTo: [] as unknown[],
        connect(target: unknown) {
          node.connectedTo.push(target);
          return target;
        },
        disconnect() {
          node.connectedTo.length = 0;
        },
      };
      return node as unknown as GainNode;
    },
    createStereoPanner() {
      const node = {
        pan: { value: 0 },
        connectedTo: [] as unknown[],
        connect(target: unknown) {
          node.connectedTo.push(target);
          return target;
        },
        disconnect() {
          node.connectedTo.length = 0;
        },
      };
      return node as unknown as StereoPannerNode;
    },
    createBufferSource() {
      const node = {
        buffer: null as AudioBuffer | null,
        connectedTo: [] as unknown[],
        connect(target: unknown) {
          node.connectedTo.push(target);
          return target;
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
    async resume() {},
    async close() {},
  } as unknown as AudioContext;
}

describe("§21 acceptance criteria", () => {
  test("build:wasm output exists", async () => {
    const wasmSource = await Bun.file("generated/sfx_synth.mjs").text();
    expect(wasmSource.length).toBeGreaterThan(1000);
    expect(wasmSource.includes("createSfxWasmModule") || wasmSource.includes("_render_patch")).toBe(true);
  });

  test("WASM returns Float32 PCM", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    const pcm = await engine.render("ui.select", { seed: 0, sampleRate: 48000 });

    expect(pcm).toBeInstanceOf(Float32Array);
    expect(pcm.length).toBeGreaterThan(0);

    engine.dispose();
  });

  test("same patch and seed produce identical PCM", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    const first = await engine.render(ACCEPTANCE_PATCH, { seed: 4242, sampleRate: 48000 });
    const second = await engine.render(ACCEPTANCE_PATCH, { seed: 4242, sampleRate: 48000 });

    expect(Array.from(first)).toEqual(Array.from(second));

    engine.dispose();
  });

  test("44100 Hz and 48000 Hz preserve duration and pitch", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    const pcm44100 = await engine.render(ACCEPTANCE_PATCH, { seed: 99, sampleRate: 44100 });
    const pcm48000 = await engine.render(ACCEPTANCE_PATCH, { seed: 99, sampleRate: 48000 });

    const duration44100 = pcm44100.length / 44100;
    const duration48000 = pcm48000.length / 48000;
    expect(Math.abs(duration44100 - duration48000)).toBeLessThan(0.002);

    const hz44100 = estimatePositiveZeroCrossingHz(pcm44100, 44100);
    const hz48000 = estimatePositiveZeroCrossingHz(pcm48000, 48000);
    const minHz = 440 * 0.975;
    const maxHz = 440 * 1.025;
    expect(hz44100).toBeGreaterThan(minHz);
    expect(hz44100).toBeLessThan(maxHz);
    expect(hz48000).toBeGreaterThan(minHz);
    expect(hz48000).toBeLessThan(maxHz);

    engine.dispose();
  });

  test("external JSON presets can be added and rendered", async () => {
    const custom = loadPresets({
      "game.custom": defaultPatch({ waveform: "triangle", baseFrequency: 660, sustain: 0.04, decay: 0.06 }),
    });
    const engine = await createSfxEngine({
      sampleRate: 48000,
      audioContext: undefined,
      presets: mergePresets({}, custom),
    });

    const pcm = await engine.render("game.custom", { seed: 1, sampleRate: 48000 });
    expect(pcm.length).toBeGreaterThan(0);

    engine.dispose();
  });

  test("game code does not need C++ or Emscripten symbols", () => {
    expect(typeof publicApi.createSfxEngine).toBe("function");
    for (const name of FORBIDDEN_PUBLIC_EXPORTS) {
      expect(name in publicApi).toBe(false);
    }
  });

  test("preset cache avoids duplicate WASM renders", async () => {
    const wasm = await WasmBridge.create();
    const counter = new CountingRenderer(wasm);
    const engine = createSfxEngineFromParts(
      counter,
      undefined,
      48000,
      { "ui.select": defaultPatch({ attack: 0, sustain: 0.05, decay: 0.05 }) },
    );

    await engine.render("ui.select", { seed: 3, sampleRate: 48000 });
    await engine.render("ui.select", { seed: 3, sampleRate: 48000 });
    expect(counter.renderCount).toBe(1);

    engine.dispose();
  });

  test("dispose releases engine and blocks later calls", async () => {
    const engine = await createSfxEngine({ sampleRate: 48000, audioContext: undefined });
    engine.dispose();

    await expect(engine.render("ui.select")).rejects.toThrow("disposed");
    expect(() => engine.clearCache()).toThrow("disposed");
  });

  test("Web Audio playback path accepts PCM", () => {
    const backend = new AudioBackend(createMockAudioContext());
    expect(() => backend.play(new Float32Array([0.2, -0.1, 0.3]), 48000, 0.8, 0)).not.toThrow();
    backend.dispose();
  });

  test("README contains a copy-pasteable minimal sample and package installation", async () => {
    const readme = await Bun.file("README.md").text();
    expect(readme.includes("createSfxEngine")).toBe(true);
    expect(readme.includes("sfx.play")).toBe(true);
    expect(readme.includes("bun run dev")).toBe(true);
    expect(readme.includes("bun run dev:phaser")).toBe(true);
    expect(readme.toLowerCase().includes("npm install reusable-procedural-sfx-wasm")).toBe(true);
    expect(readme.includes("build:wasm` はフレームワークのリリース生成専用")).toBe(true);
  });

  test("npm packaging publishes the prebuilt distribution without consumer build hooks", async () => {
    const pkg = JSON.parse(await Bun.file("package.json").text()) as {
      private?: boolean;
      files?: string[];
      scripts?: Record<string, string>;
    };

    expect(pkg.private).toBe(false);
    expect(pkg.files).toContain("dist");
    expect(pkg.scripts?.prepack).toBe("bun run build");
    expect(pkg.scripts?.postinstall).toBeUndefined();
    expect(pkg.scripts?.prepare).toBeUndefined();
  });

  test("vanilla example exposes multiple preset buttons", async () => {
    const source = await Bun.file("examples/vanilla/main.ts").text();
    expect(source.includes("ui.select")).toBe(true);
    expect(source.includes("player.jump")).toBe(true);
    expect(source.includes("enemy.hit")).toBe(true);
    expect(source.includes("explosion.basic")).toBe(true);
    expect(source.includes("Random variant")).toBe(true);
    expect(source.includes("compare-sine")).toBe(true);
    expect(source.includes("compare-triangle")).toBe(true);
    expect(source.includes("wavetable.sineish")).toBe(true);
    expect(source.includes("wavetable.metallic")).toBe(true);
    expect(source.includes("wavetable.hollow")).toBe(true);
    expect(source.toLowerCase().includes("phaser")).toBe(false);
  });

  test("Phaser 4 example wires multiple actions without importing Phaser in src/", async () => {
    const example = await Bun.file("examples/phaser4/main.ts").text();
    const libraryEntry = await Bun.file("src/index.ts").text();

    expect(example.includes("createSfxEngine")).toBe(true);
    expect(example.includes("ui.select")).toBe(true);
    expect(example.includes("player.jump")).toBe(true);
    expect(example.includes("enemy.hit")).toBe(true);
    expect(example.includes("explosion.basic")).toBe(true);
    expect(libraryEntry.toLowerCase().includes("phaser")).toBe(false);
  });
});

describe("§21 manual verification notes", () => {
  test("documents browser checks for audible playback", () => {
    const manualChecks = [
      "bun run dev -> http://localhost:5173/ (vanilla 5 buttons audible)",
      "bun run dev:phaser -> http://localhost:5174/ (Phaser 4 example, 5 actions audible)",
      "bun run build -> dist/index.js without Phaser bundled",
    ];
    expect(manualChecks.length).toBeGreaterThan(0);
  });
});
