declare module "*.mjs" {
  import type { SfxWasmInstance } from "./wasmTypes.ts";

  const createSfxWasmModule: (opts?: {
    wasmBinary?: ArrayBuffer | Uint8Array;
  }) => Promise<SfxWasmInstance>;

  export default createSfxWasmModule;
}
