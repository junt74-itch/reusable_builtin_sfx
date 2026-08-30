import { AudioBackend } from "./AudioBackend.ts";
import { makeCacheKey, PcmCache } from "./cache.ts";
import { validatePatch } from "./patch.ts";
import { builtinPresets, mergePresets } from "./presets.ts";
import { type CreateSfxEngineOptions, type PlayOptions, type RenderOptions, type SfxEngine, type SfxPatchV1 } from "./types.ts";
import { WasmBridge } from "./WasmBridge.ts";

export type PcmRenderer = {
  render(patch: SfxPatchV1, sampleRate: number, seed: number): Float32Array;
  dispose(): void;
};

class SfxEngineImpl implements SfxEngine {
  private readonly renderer: PcmRenderer;
  private readonly backend: AudioBackend | undefined;
  private readonly sampleRate: number;
  private readonly presets: Record<string, SfxPatchV1>;
  private readonly cache = new PcmCache();
  private disposed = false;

  constructor(
    renderer: PcmRenderer,
    backend: AudioBackend | undefined,
    sampleRate: number,
    presets: Record<string, SfxPatchV1>,
  ) {
    this.renderer = renderer;
    this.backend = backend;
    this.sampleRate = sampleRate;
    this.presets = { ...presets };
  }

  async play(nameOrPatch: string | SfxPatchV1, options: PlayOptions = {}): Promise<void> {
    this.assertOpen();
    if (!this.backend) {
      throw new Error("AudioContext is not available");
    }
    const seed = options.seed ?? 0;
    const pcm =
      typeof nameOrPatch === "string"
        ? this.renderPreset(nameOrPatch, this.sampleRate, seed)
        : this.copyPcm(this.renderer.render(this.resolve(nameOrPatch), this.sampleRate, seed));
    await this.backend.resume();
    this.backend.play(pcm, this.sampleRate, options.volume ?? 1, options.pan ?? 0);
  }

  async render(nameOrPatch: string | SfxPatchV1, options: RenderOptions = {}): Promise<Float32Array> {
    this.assertOpen();
    const sampleRate = options.sampleRate ?? this.sampleRate;
    const seed = options.seed ?? 0;
    if (typeof nameOrPatch === "string") {
      return this.renderPreset(nameOrPatch, sampleRate, seed);
    }
    return this.copyPcm(this.renderer.render(this.resolve(nameOrPatch), sampleRate, seed));
  }

  async preload(names: string[]): Promise<void> {
    this.assertOpen();
    for (const name of names) {
      this.renderPreset(name, this.sampleRate, 0);
    }
  }

  clearCache(): void {
    this.assertOpen();
    this.cache.clear();
  }

  setMasterVolume(volume: number): void {
    this.assertOpen();
    this.backend?.setMasterVolume(volume);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.cache.clear();
    this.backend?.dispose();
    this.renderer.dispose();
  }

  private renderPreset(name: string, sampleRate: number, seed: number): Float32Array {
    const key = makeCacheKey(name, seed, sampleRate);
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const patch = this.resolve(name);
    const pcm = this.renderer.render(patch, sampleRate, seed);
    this.cache.set(key, pcm);
    const stored = this.cache.get(key);
    if (!stored) {
      throw new Error("cache store failed");
    }
    return stored;
  }

  private resolve(nameOrPatch: string | SfxPatchV1): SfxPatchV1 {
    if (typeof nameOrPatch !== "string") {
      return validatePatch(nameOrPatch);
    }
    const patch = this.presets[nameOrPatch];
    if (!patch) {
      throw new Error(`unknown preset: ${nameOrPatch}`);
    }
    return patch;
  }

  private copyPcm(pcm: Float32Array): Float32Array {
    return pcm.slice();
  }

  private assertOpen(): void {
    if (this.disposed) {
      throw new Error("SfxEngine is disposed");
    }
  }
}

export function createSfxEngineFromParts(
  renderer: PcmRenderer,
  backend: AudioBackend | undefined,
  sampleRate: number,
  presets: Record<string, SfxPatchV1>,
): SfxEngine {
  return new SfxEngineImpl(renderer, backend, sampleRate, presets);
}

export async function createSfxEngine(options: CreateSfxEngineOptions = {}): Promise<SfxEngine> {
  const wasm = await WasmBridge.create();
  const audioContext =
    "audioContext" in options
      ? options.audioContext
      : typeof AudioContext !== "undefined"
        ? new AudioContext()
        : undefined;
  const backend = audioContext ? new AudioBackend(audioContext) : undefined;
  const sampleRate = options.sampleRate ?? backend?.sampleRate ?? 48000;
  const presets = mergePresets(builtinPresets(), options.presets ?? {});
  return createSfxEngineFromParts(wasm, backend, sampleRate, presets);
}
