# T000 ビルド環境

## Status

**DONE**（実装担当は Composer ではない）

## Goal

Bun + Vite + TypeScript + Emscripten 6.0.8 で、C++ スタブが WASM になり、TS から Float32 PCM を取れる。

## 結果

- Emscripten 6.0.8 を `C:\source\emsdk` に導入
- `bun run build:wasm` / `bun run test` / `bun run typecheck` / `bun run build` が通る
- `render()` はエンベロープ長の無音（実 DSP は T130）

## Composer は何もしない

次は T010。
