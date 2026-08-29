# T200 WASM エラー処理

## Depends on

- T130

## Goal

不正入力でクラッシュせず、JS が空 PCM または明確な失敗を扱える。メモリは copy 後にリークしない（既存の context バッファ方式を維持してよい）。

## Out of scope

- Public API の新しいメソッド名
- preset / cache

## Files

- 変更: `wasm/bindings.cpp`, `src/WasmBridge.ts`, `tests/toolchain.test.ts`

## Spec

`render_patch` が nullptr / packed_len 不一致 / sample_rate<=0 のとき:

- `*out_len = 0`
- 戻り値 `nullptr`
- プロセスを abort しない

JS `WasmBridge.render`:

- その場合 `Float32Array(0)` を返すか、TS 層で validate 済みなら到達しない
- 例外を出すならメッセージは Emscripten 内部名を含まない
- `_malloc` 失敗時も `_free` の対応を崩さない
- dispose 後の render は既存どおり throw

HEAP ポインタはすぐ `slice` copy（既存）。変えない。

## Acceptance Criteria

- [ ] sampleRate 0 を TS から渡すテスト（空 or throw を仕様として固定）
- [ ] 20 以外の packed は C++ 側で安全
- [ ] `HEAPF32` が index.ts から export されていない

## Verify

```bash
bun run test
bun run typecheck
bun run build
```
