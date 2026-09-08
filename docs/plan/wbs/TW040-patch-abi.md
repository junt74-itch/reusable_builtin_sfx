# TW040 Patch / ABI

## Status

**DONE**（レビュー済み / `test:core` `test` `typecheck` 成功）

## Goal

`wavetableId` を packed ABI の 21 番目 float として往復させ、TypeScript mirror を同期する。名前付き registry と WASM 登録 API は次タスク。

## Dependencies

- TW030

## Files

- 変更: `core/include/sfx_patch.hpp`, `wasm/bindings.cpp`, `src/types.ts`, `src/patch.ts`
- 変更: `core/tests/test_runner.cpp`, `tests/patch.test.ts`, `tests/toolchain.test.ts`
- 変更: `docs/reference/sfx-units-and-algorithm.md` の packed 数と waveform 列のみ（説明文の追加は最小）

## Implementation

規則（TW000 D1）:

- `SFX_PACKED_FLOAT_COUNT = 21`
- `pack_patch` / `packPatch`: `out[20] = wavetableId`（省略時 0）
- `unpack_patch`: `in[20]` を `int` 化。負なら 0
- waveform 文字列 `"wavetable32"` ↔ 指数 `5`
- `SfxPatchV1` に `wavetableId?: number` を追加。`version` は `1` のまま
- `validatePatch`: 既存5波形に `wavetableId` を要求しない。指定時は有限な整数 `>= 0`
- `wavetable32` 波形も version 1 で受理する。未指定 `wavetableId` は 0
- WASM `render_patch`: `packed_len == 20` または `21` を受理。20 のときは `wavetableId = 0`。1 や 22 などは現行どおり失敗
- 既存 JSON preset を書き換えない

`render_patch` は unpack 後、context の bank をまだ持たない場合でも既存5波形 render が通ること。bank 接続は TW050。

## Acceptance Criteria

- [x] C++ / TS の packed 数が 21 で一致する
- [x] `wavetableId` が pack/unpack で往復する
- [x] 旧 20 float を WASM が受理し、既存5波形が鳴る
- [x] 不正 packed 長（1 など）は失敗する
- [x] `"wavetable32"` が validate / pack できる
- [x] 既存12 preset の validate が通る
- [x] 公開 API に `HEAPF32` / `_malloc` を出さない

## Verification

```bash
bun run test:core
bun run test
bun run typecheck
```

## Out of Scope

- `register_wavetable` WASM API
- 名前 → ID の高レベル registry
- example UI
- Patch version 2
