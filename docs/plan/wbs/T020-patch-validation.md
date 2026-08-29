# T020 TypeScript Patch バリデーション

## Status

**DONE**

## Depends on

- T000

## Goal

`SfxPatchV1` の実行時バリデーションを追加する。不正値は throw。C++ の packed 並びは変えない。

## Out of scope

- C++ DSP
- preset JSON ローダ（T320）
- Bfxr 0..1 スライダー空間への変換

## Files

- 変更候補: `src/types.ts`, `src/index.ts`
- 作成候補: `src/patch.ts`, `tests/patch.test.ts`
- 禁止: `core/include/sfx_patch.hpp` のフィールド順序変更

## Spec

`validatePatch(input: unknown): SfxPatchV1`

- `version` は `1` のみ
- `waveform` は `square | saw | sine | triangle | noise`
- 数値フィールドは有限数（`NaN` / `Infinity` 不可）
- `baseFrequency` は `> 0` かつ `<= 20000`
- `attack` / `sustain` / `decay` は `>= 0` かつ `<= 5`
- `duty` は省略時 0.5。指定時は `0..1`
- `masterVolume` は省略時 0.5。指定時は `0..1`
- 未知キーは無視してよい（将来フィールド用）
- `packPatch` は validate 済みを前提でも、Engine から呼ぶ前に validate する

単位は `docs/reference/sfx-units-and-algorithm.md`。

## Acceptance Criteria

- [x] 正常パッチが通る
- [x] 不正 waveform / NaN / 負の attack で throw
- [x] `SFX_PACKED_FLOAT_COUNT === 20` のテストがある
- [x] C++ packed 順と TS `packPatch` のコメントまたはテストで対応が分かる

## Verify

```bash
bun test tests/patch.test.ts
bun run typecheck
```
