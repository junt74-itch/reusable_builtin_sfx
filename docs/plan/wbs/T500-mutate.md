# T500 mutatePatch API

## Status

**DONE**

## Depends on

- T020

## Goal

builtin preset をカテゴリとして揺らす決定的 `mutatePatch` を Public API に出す。ゲームの `play` seed（noise PRNG）とは別で、**パラメータ抽選**用である。

## Out of scope

- 作者向け DOM / Vite 画面（T510）
- WAV / CLI（T530 T540）
- waveform の変更（カテゴリの性格を残す）
- C++ / WASM の変更

## Files

- 作成: `src/mutate.ts`, `tests/mutate.test.ts`
- 変更: `src/index.ts`, `tests/engine.test.ts`（public export 一覧）

## Spec

```ts
mutatePatch(base: SfxPatchV1, options?: { amount?: number; seed?: number }): SfxPatchV1
```

- `amount` は 0..1。非有限は throw、範囲外は clamp。0 は入力と一致（`validatePatch` 済みのコピー）
- `seed` は決定的。同一 `base + amount + seed` は同一 patch。`0` は C++ `SfxRng` と同様に内部 state `1`
- TS 側 xorshift32。`Math.random` / `std::rand` 相当は使わない
- `version` 固定。**waveform は変えない**
- 数値はフィールドごとのスケールで加算し、`validatePatch` で通る値にクランプ
  - `baseFrequency` は相対（amount 1 で ±数十 %）
  - `attack` / `sustain` / `decay` は秒の絶対
  - `frequencySlide` は octave/s の絶対
- 0 のオプション（vibrato / filter / phaser 等）と LP 開放（cutoff 1）は `amount` が低いとそのまま
- 単位は `docs/reference/sfx-units-and-algorithm.md`。0..1 スライダー空間を API に出さない

## Acceptance Criteria

- [x] 同一 seed で patch が一致する
- [x] `amount === 0` で入力と一致する
- [x] 結果は常に `validatePatch` を通る
- [x] 異なる seed で差が出る
- [x] `src/index.ts` から `mutatePatch` を export する

## Verify

```bash
bun test tests/mutate.test.ts tests/engine.test.ts
bun run typecheck
```
