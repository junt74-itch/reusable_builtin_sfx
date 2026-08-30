import { packPatch, type SfxPatchV1 } from "./types.ts";

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
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPF32: Float32Array;
  HEAP32: Int32Array;
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

  private assertOpen(): void {
    if (this.disposed || this.contextPtr === 0) {
      throw new Error("WasmBridge is disposed");
    }
  }
}
