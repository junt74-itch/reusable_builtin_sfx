# TW050 WASM wavetable bindings

## Status

**DONE**（レビュー済み / wavetable テスト・typecheck 成功。SfxEngine 公開面は未拡張）

## Goal

WASM context に WavetableBank を持たせ、JS から 32 byte を安全に登録・削除できるようにする。名前付き API は作らない。

## Dependencies

- TW040

## Files

- 変更: `wasm/bindings.cpp`, `src/WasmBridge.ts`, `scripts/build-wasm.ts`（EXPORTED_FUNCTIONS に新規 C 関数を足す必要がある場合のみ）
- 作成: `tests/wavetable.test.ts`（または既存 toolchain テストへ最小追加）

## Implementation

C API（`extern "C"`）:

```text
int register_wavetable(void* ctx, int id, const uint8_t* data, int length)
int unregister_wavetable(void* ctx, int id)
void clear_wavetables(void* ctx)
```

- 成功は非 0 / 失敗は 0（unregister の未登録も 0）
- length は 32 以外失敗
- `SfxContext` が `WavetableBank` を所有する
- `render_patch` は `render(patch, sample_rate, seed, &context->bank)` を呼ぶ
- 登録時に WASM heap から 32 byte をコピーする。JS buffer 寿命に依存しない
- グローバル bank 禁止

TypeScript `WasmBridge` に低レベルメソッド:

```ts
registerWavetable(id: number, data: Uint8Array): void;
unregisterWavetable(id: number): void;
clearWavetables(): void;
```

- 長さ 31/33 は throw
- 失敗は throw（Public に HEAP を出さない）
- `SfxEngine` 公開面はこのタスクではまだ広げない

## Acceptance Criteria

- [x] Uint8Array(32) を登録して `waveform: "wavetable32"` + 対応 `wavetableId` で PCM が取れる
- [x] 長さ不正を拒否する
- [x] unregister / clear 後の render は安全（無音または 0 成分、クラッシュなし）
- [x] 登録後に JS 側配列を書き換えても C++ 側は元データを使う
- [x] 2 エンジンを並列 create しても bank が混線しない
- [x] 既存5波形・既存 preset の WASM render が通る

## Verification

```bash
bun run test
bun run typecheck
bun run build
```

## Out of Scope

- `sfx.registerWavetable("bell", data)` 名前付き API
- Patch の `wavetable: "bell"` 解決
- example UI / サンプル JSON
