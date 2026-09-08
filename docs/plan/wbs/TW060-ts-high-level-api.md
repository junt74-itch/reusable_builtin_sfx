# TW060 TypeScript high-level API

## Status

**DONE**（レビュー済み。失敗 register の名前漏れを修正済み）

## Goal

`SfxEngine` から名前付き wavetable を登録し、Patch の `wavetable: "bell"` を整数 ID に解決して play/render できるようにする。

## Dependencies

- TW050

## Files

- 変更: `src/types.ts`, `src/patch.ts`, `src/SfxEngine.ts`, `src/index.ts`, `src/WasmBridge.ts`（必要なら）
- 変更: `tests/engine.test.ts`, `tests/patch.test.ts`, `tests/wavetable.test.ts`

## Implementation

公開 API:

```ts
sfx.registerWavetable(nameOrId: string | number, data: Uint8Array): void;
sfx.unregisterWavetable(nameOrId: string | number): void;
sfx.clearWavetables(): void;
```

規則（TW000 D4）:

- 数値 ID はそのまま WASM へ渡す
- 文字列名はエンジン内 map で整数へ解決。`0` は未指定予約。名前付きは `1` から割当
- 同じ名前の再登録は同一 ID を上書き
- `Uint8Array` 以外、長さ 31/33 は throw
- Patch に `wavetable?: string` を追加してよい。play/render 前に名前→`wavetableId` へ正規化する
- 既存5波形に `wavetable` を要求しない
- `waveform: "wavetable32"` で名前も ID も無い場合は安全に失敗または無音。クラッシュ禁止
- cache key に wavetable 内容または登録世代を含める。同一 Patch 名でも table 差し替え後は古い PCM を返さない
- Public export に Emscripten 内部を出さない

`mutatePatch` は wavetable を触らなくてよい。

## Acceptance Criteria

- [x] `registerWavetable("bell", Uint8Array(32))` 後に `{ waveform: "wavetable32", wavetable: "bell" }` で render/play できる
- [x] 長さ不正を拒否する
- [x] 重複名は上書きされる
- [x] unregister / clear が動く
- [x] 未登録名は安全に失敗する
- [x] cache と併用しても差し替えが反映される
- [x] 既存 preset / 既存5波形 API が回帰しない

## Verification

```bash
bun run test
bun run typecheck
bun run build
```

## Out of Scope

- サンプル wavetable JSON
- example UI
- wavetable editor
- `mutatePatch` 拡張
