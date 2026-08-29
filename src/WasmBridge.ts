import { packPatch, type SfxPatchV1 } from "./types.ts";
import type { SfxWasmInstance } from "./wasmTypes.ts";

export class WasmBridge {
  private readonly module: SfxWasmInstance;
  private contextPtr: number;

  private constructor(module: SfxWasmInstance, contextPtr: number) {
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
    const packed = packPatch(patch);
    const packedPtr = this.module._malloc(packed.byteLength);
    const lenPtr = this.module._malloc(4);
    try {
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
      this.module._free(packedPtr);
      this.module._free(lenPtr);
    }
  }

  dispose(): void {
    if (this.contextPtr === 0) {
      return;
    }
    this.module._destroy_context(this.contextPtr);
    this.contextPtr = 0;
  }

  private assertOpen(): void {
    if (this.contextPtr === 0) {
      throw new Error("WasmBridge is disposed");
    }
  }
}
