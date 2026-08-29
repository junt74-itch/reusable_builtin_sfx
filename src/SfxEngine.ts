import { AudioBackend } from "./AudioBackend.ts";
import { validatePatch } from "./patch.ts";
import { defaultPatch, type CreateSfxEngineOptions, type PlayOptions, type RenderOptions, type SfxEngine, type SfxPatchV1 } from "./types.ts";
import { WasmBridge } from "./WasmBridge.ts";

class SfxEngineImpl implements SfxEngine {
  private readonly wasm: WasmBridge;
  private readonly backend: AudioBackend | undefined;
  private readonly sampleRate: number;
  private readonly presets: Record<string, SfxPatchV1>;
  private disposed = false;

  constructor(
    wasm: WasmBridge,
    backend: AudioBackend | undefined,
    sampleRate: number,
    presets: Record<string, SfxPatchV1>,
  ) {
    this.wasm = wasm;
    this.backend = backend;
    this.sampleRate = sampleRate;
    this.presets = { ...presets };
  }

  async play(nameOrPatch: string | SfxPatchV1, options: PlayOptions = {}): Promise<void> {
    this.assertOpen();
    if (!this.backend) {
      throw new Error("AudioContext is not available");
    }
    const pcm = this.wasm.render(this.resolve(nameOrPatch), this.sampleRate, options.seed ?? 0);
    await this.backend.resume();
    this.backend.play(pcm, this.sampleRate, options.volume ?? 1, options.pan ?? 0);
  }

  async render(nameOrPatch: string | SfxPatchV1, options: RenderOptions = {}): Promise<Float32Array> {
    this.assertOpen();
    const sampleRate = options.sampleRate ?? this.sampleRate;
    return this.wasm.render(this.resolve(nameOrPatch), sampleRate, options.seed ?? 0);
  }

  async preload(_names: string[]): Promise<void> {
    this.assertOpen();
  }

  clearCache(): void {}

  setMasterVolume(volume: number): void {
    this.assertOpen();
    this.backend?.setMasterVolume(volume);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.backend?.dispose();
    this.wasm.dispose();
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

  private assertOpen(): void {
    if (this.disposed) {
      throw new Error("SfxEngine is disposed");
    }
  }
}

export async function createSfxEngine(options: CreateSfxEngineOptions = {}): Promise<SfxEngine> {
  const wasm = await WasmBridge.create();
  const audioContext = options.audioContext ?? (typeof AudioContext !== "undefined" ? new AudioContext() : undefined);
  const backend = audioContext ? new AudioBackend(audioContext) : undefined;
  const sampleRate = options.sampleRate ?? backend?.sampleRate ?? 48000;
  return new SfxEngineImpl(wasm, backend, sampleRate, options.presets ?? { "ui.select": defaultPatch() });
}
