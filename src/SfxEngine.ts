import { AudioBackend } from "./AudioBackend.ts";
import { makeCacheKey, PcmCache } from "./cache.ts";
import { validatePatch } from "./patch.ts";
import { builtinPresets, mergePresets } from "./presets.ts";
import { registeredWavetables } from "./wavetables.ts";
import { type CreateSfxEngineOptions, type PlayOptions, type RenderOptions, type SfxEngine, type SfxPatchV1 } from "./types.ts";
import { WasmBridge } from "./WasmBridge.ts";

export type PcmRenderer = {
  render(patch: SfxPatchV1, sampleRate: number, seed: number): Float32Array;
  dispose(): void;
  registerWavetable?(id: number, data: Uint8Array): void;
  unregisterWavetable?(id: number): void;
  clearWavetables?(): void;
};

class SfxEngineImpl implements SfxEngine {
  private readonly renderer: PcmRenderer;
  private readonly backend: AudioBackend | undefined;
  private readonly sampleRate: number;
  private readonly presets: Record<string, SfxPatchV1>;
  private readonly cache = new PcmCache();
  private readonly wavetableNames = new Map<string, number>();
  private readonly wavetableIds = new Map<number, string>();
  private nextWavetableId = 1;
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

  registerWavetable(nameOrId: string | number, data: Uint8Array): void {
    this.assertOpen();

    if (typeof nameOrId === "number") {
      if (!Number.isInteger(nameOrId) || nameOrId < 0) {
        throw new Error("wavetable id must be a non-negative integer");
      }
      this.callRendererWavetable("registerWavetable", nameOrId, data);
      this.cache.clear();
      return;
    }

    if (typeof nameOrId !== "string" || nameOrId.length === 0) {
      throw new Error("wavetable name must be a non-empty string");
    }

    const existing = this.wavetableNames.get(nameOrId);
    if (existing !== undefined) {
      this.callRendererWavetable("registerWavetable", existing, data);
      this.cache.clear();
      return;
    }

    const id = this.nextWavetableId;
    this.callRendererWavetable("registerWavetable", id, data);
    this.wavetableNames.set(nameOrId, id);
    this.wavetableIds.set(id, nameOrId);
    this.nextWavetableId++;
    this.cache.clear();
  }

  unregisterWavetable(nameOrId: string | number): void {
    this.assertOpen();
    const id = this.resolveWavetableName(nameOrId);
    this.callRendererWavetable("unregisterWavetable", id);
    this.removeWavetableMapping(id);
    this.cache.clear();
  }

  clearWavetables(): void {
    this.assertOpen();
    this.callRendererWavetable("clearWavetables");
    this.wavetableNames.clear();
    this.wavetableIds.clear();
    this.nextWavetableId = 1;
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
      return this.normalizeWavetable(validatePatch(nameOrPatch));
    }
    const patch = this.presets[nameOrPatch];
    if (!patch) {
      throw new Error(`unknown preset: ${nameOrPatch}`);
    }
    return this.normalizeWavetable(validatePatch(patch));
  }

  private normalizeWavetable(patch: SfxPatchV1): SfxPatchV1 {
    if (patch.wavetable === undefined) {
      return patch;
    }

    const id = this.wavetableNames.get(patch.wavetable);
    if (id === undefined) {
      throw new Error(`unknown wavetable: ${patch.wavetable}`);
    }

    const { wavetable: _wavetable, wavetableId: _wavetableId, ...rest } = patch;
    return { ...rest, wavetableId: id };
  }

  private resolveWavetableName(nameOrId: string | number): number {
    if (typeof nameOrId === "number") {
      if (!Number.isInteger(nameOrId) || nameOrId < 0) {
        throw new Error("wavetable id must be a non-negative integer");
      }
      return nameOrId;
    }

    if (typeof nameOrId !== "string" || nameOrId.length === 0) {
      throw new Error("wavetable name must be a non-empty string");
    }

    const id = this.wavetableNames.get(nameOrId);
    if (id === undefined) {
      throw new Error(`unknown wavetable: ${nameOrId}`);
    }
    return id;
  }

  private removeWavetableMapping(id: number): void {
    const name = this.wavetableIds.get(id);
    if (name !== undefined) {
      this.wavetableNames.delete(name);
      this.wavetableIds.delete(id);
    }
  }

  private callRendererWavetable(method: "registerWavetable", id: number, data: Uint8Array): void;
  private callRendererWavetable(method: "unregisterWavetable", id: number): void;
  private callRendererWavetable(method: "clearWavetables"): void;
  private callRendererWavetable(
    method: "registerWavetable" | "unregisterWavetable" | "clearWavetables",
    id?: number,
    data?: Uint8Array,
  ): void {
    if (method === "registerWavetable") {
      const fn = this.renderer.registerWavetable;
      if (typeof fn !== "function") {
        throw new Error("renderer does not support registerWavetable");
      }
      fn.call(this.renderer, id as number, data as Uint8Array);
      return;
    }

    if (method === "unregisterWavetable") {
      const fn = this.renderer.unregisterWavetable;
      if (typeof fn !== "function") {
        throw new Error("renderer does not support unregisterWavetable");
      }
      fn.call(this.renderer, id as number);
      return;
    }

    const fn = this.renderer.clearWavetables;
    if (typeof fn !== "function") {
      throw new Error("renderer does not support clearWavetables");
    }
    fn.call(this.renderer);
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
  const engine = createSfxEngineFromParts(wasm, backend, sampleRate, presets);
  for (const [name, data] of Object.entries(registeredWavetables())) {
    engine.registerWavetable(name, data);
  }
  return engine;
}
