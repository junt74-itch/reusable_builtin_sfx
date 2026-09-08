export interface SfxWasmInstance {
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

declare function createSfxWasmModule(opts?: {
  wasmBinary?: ArrayBuffer | Uint8Array;
}): Promise<SfxWasmInstance>;

export default createSfxWasmModule;
