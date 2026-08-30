declare module "*.mjs" {
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

  const createSfxWasmModule: (opts?: {
    wasmBinary?: ArrayBuffer | Uint8Array;
  }) => Promise<SfxWasmModule>;

  export default createSfxWasmModule;
}
