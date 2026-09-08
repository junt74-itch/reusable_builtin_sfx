import { packPatch, type SfxPatchV1 } from "./types.ts";

const SFX_WAVETABLE32_SIZE = 32;

interface SfxWasmModule {
  _create_context(): number;
  _destroy_context(ctx: number): void;
  _render_patch(
    ctx: number,
    packedPtr: number,
    packedLen: number,
    sampleRate: number,
    seed: number,
    outLenPtr: number,
  ): number;
  _register_wavetable(ctx: number, id: number, dataPtr: number, length: number): number;
  _unregister_wavetable(ctx: number, id: number): number;
  _clear_wavetables(ctx: number): void;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPF32: Float32Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
}

export class WasmBridge {
  private readonly module: SfxWasmModule;
  private contextPtr: number;
  private disposed = false;

  private constructor(module: SfxWasmModule, contextPtr: number) {
    this.module = module;
    this.contextPtr = contextPtr;
  }

  static async create(): Promise<WasmBridge> {
    const { default: createSfxWasmModule } = await import("../generated/sfx_synth.mjs");
    const module = await createSfxWasmModule();
    const contextPtr = module._create_context();
    if (contextPtr === 0) {
      throw new Error("create_context failed");
    }
    return new WasmBridge(module, contextPtr);
  }

  render(patch: SfxPatchV1, sampleRate: number, seed: number): Float32Array {
    this.assertOpen();
    if (sampleRate <= 0) {
      return new Float32Array(0);
    }

    const packed = packPatch(patch);
    let packedPtr = 0;
    let lenPtr = 0;
    try {
      packedPtr = this.module._malloc(packed.byteLength);
      lenPtr = this.module._malloc(4);
      if (packedPtr === 0 || lenPtr === 0) {
        return new Float32Array(0);
      }

      this.module.HEAPF32.set(packed, packedPtr >> 2);
      const pcmPtr = this.module._render_patch(
        this.contextPtr,
        packedPtr,
        packed.length,
        sampleRate,
        seed >>> 0,
        lenPtr,
      );
      const length = this.module.HEAP32[lenPtr >> 2] ?? 0;
      if (pcmPtr === 0 || length <= 0) {
        return new Float32Array(0);
      }
      return this.module.HEAPF32.slice(pcmPtr >> 2, (pcmPtr >> 2) + length);
    } finally {
      if (packedPtr !== 0) {
        this.module._free(packedPtr);
      }
      if (lenPtr !== 0) {
        this.module._free(lenPtr);
      }
    }
  }

  registerWavetable(id: number, data: Uint8Array): void {
    this.assertOpen();
    this.assertWavetableId(id);
    if (!(data instanceof Uint8Array)) {
      throw new Error("wavetable data must be a Uint8Array");
    }
    if (data.length !== SFX_WAVETABLE32_SIZE) {
      throw new Error(`wavetable data must be ${SFX_WAVETABLE32_SIZE} bytes`);
    }

    let dataPtr = 0;
    try {
      dataPtr = this.module._malloc(SFX_WAVETABLE32_SIZE);
      if (dataPtr === 0) {
        throw new Error("register_wavetable failed");
      }
      this.module.HEAPU8.set(data, dataPtr);
      if (this.module._register_wavetable(this.contextPtr, id, dataPtr, SFX_WAVETABLE32_SIZE) === 0) {
        throw new Error("register_wavetable failed");
      }
    } finally {
      if (dataPtr !== 0) {
        this.module._free(dataPtr);
      }
    }
  }

  unregisterWavetable(id: number): void {
    this.assertOpen();
    this.assertWavetableId(id);
    if (this.module._unregister_wavetable(this.contextPtr, id) === 0) {
      throw new Error("unregister_wavetable failed");
    }
  }

  clearWavetables(): void {
    this.assertOpen();
    this.module._clear_wavetables(this.contextPtr);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.contextPtr !== 0) {
      this.module._destroy_context(this.contextPtr);
      this.contextPtr = 0;
    }
  }

  static async probeInvalidPackedLength(): Promise<boolean> {
    const bridge = await WasmBridge.create();
    try {
      return bridge.renderInvalidPackedLengthForTest();
    } finally {
      bridge.dispose();
    }
  }

  static async probeLegacyPackedLength(): Promise<boolean> {
    const bridge = await WasmBridge.create();
    try {
      return bridge.renderLegacyPackedLengthForTest();
    } finally {
      bridge.dispose();
    }
  }

  private renderInvalidPackedLengthForTest(): boolean {
    this.assertOpen();
    let packedPtr = 0;
    let lenPtr = 0;
    try {
      packedPtr = this.module._malloc(4);
      lenPtr = this.module._malloc(4);
      if (packedPtr === 0 || lenPtr === 0) {
        return true;
      }

      const pcmPtr = this.module._render_patch(this.contextPtr, packedPtr, 1, 48000, 0, lenPtr);
      const length = this.module.HEAP32[lenPtr >> 2] ?? -1;
      return pcmPtr === 0 && length === 0;
    } finally {
      if (packedPtr !== 0) {
        this.module._free(packedPtr);
      }
      if (lenPtr !== 0) {
        this.module._free(lenPtr);
      }
    }
  }

  private renderLegacyPackedLengthForTest(): boolean {
    this.assertOpen();
    const patch: SfxPatchV1 = {
      version: 1,
      waveform: "sine",
      baseFrequency: 440,
      frequencySlide: 0,
      frequencyDeltaSlide: 0,
      attack: 0,
      sustain: 0.1,
      decay: 0.1,
      vibratoDepth: 0,
      vibratoSpeed: 0,
    };
    const full = packPatch(patch);
    const legacy = full.subarray(0, 20);

    let packedPtr = 0;
    let lenPtr = 0;
    try {
      packedPtr = this.module._malloc(legacy.byteLength);
      lenPtr = this.module._malloc(4);
      if (packedPtr === 0 || lenPtr === 0) {
        return false;
      }

      this.module.HEAPF32.set(legacy, packedPtr >> 2);
      const pcmPtr = this.module._render_patch(
        this.contextPtr,
        packedPtr,
        legacy.length,
        48000,
        1,
        lenPtr,
      );
      const length = this.module.HEAP32[lenPtr >> 2] ?? 0;
      return pcmPtr !== 0 && length > 0;
    } finally {
      if (packedPtr !== 0) {
        this.module._free(packedPtr);
      }
      if (lenPtr !== 0) {
        this.module._free(lenPtr);
      }
    }
  }

  private assertOpen(): void {
    if (this.disposed || this.contextPtr === 0) {
      throw new Error("WasmBridge is disposed");
    }
  }

  private assertWavetableId(id: number): void {
    if (!Number.isInteger(id) || id < 0) {
      throw new Error("wavetable id must be a non-negative integer");
    }
  }
}
