# T300 WasmBridge 完成

## Depends on

- T200

## Goal

Emscripten モジュールの生成・HEAP・malloc を `WasmBridge` に閉じ込める。ゲームコードは `SfxPatchV1` と `Float32Array` だけ見る。

## Out of scope

- AudioContext
- Phaser

## Files

- 変更: `src/WasmBridge.ts`, `src/SfxEngine.ts`, `src/index.ts`, `tests/*.test.ts`

## Spec

- `src/index.ts` が `SfxWasmInstance` / `_malloc` / `HEAPF32` を export しない
- 生成モジュールの import パスは `WasmBridge` のみ
- 複数 `createSfxEngine()` が独立 context を持つ（同時 render が混線しない）
- dispose 後に module を使い続けない

## Acceptance Criteria

- [ ] 2 エンジンを並列 create → 異なる seed で別 PCM、破棄後に throw
- [ ] Public export の型に Emscripten 名が無い

## Verify

```bash
bun run test
bun run typecheck
```
