# T540 CLI mutate

## Status

**DONE**

## Depends on

- T500 T020

## Goal

`bun run sfx mutate <preset.json> --count N` が T500 の `mutatePatch` を呼び、JSON（または stdout）に変種を出す。カテゴリは preset mutate のみ。`random` 全生成は入れない。

## Out of scope

- `bun run sfx random`
- `bun run sfx render` / WAV 書き出し（必要なら T530 の `encodeWavPcm16` を後で接続）
- 作者向け GUI の変更
- C++ / WASM の変更

## Files

- 作成: `scripts/sfx-cli.ts`（または `scripts/sfx/mutate.ts`）
- 変更: `package.json`（`sfx` スクリプト）

## Spec

```bash
bun run sfx mutate presets/enemy.hit.json --count 20
```

- 入力 JSON を `validatePatch` する
- 各変種は `mutatePatch(base, { amount, seed })`。seed は 0..count-1 または `--seed` 基準
- `--amount` 省略時は 0.45（Medium）
- 出力は JSON 配列、または `--out dir` で `name-0001.json` のように分割
- `Math.random` を mutate 本体に使わない（seed は引数または連番）
- `npm` / `yarn` / `pnpm` 手順を足さない

## Acceptance Criteria

- [x] 同じ入力 + seed で同じ JSON が出る
- [x] 未知 waveform / 壊れた JSON は非 0 終了
- [x] `mutatePatch` を再実装せず import する
- [x] README に 1 例がある

## Verify

```bash
bun run sfx mutate presets/ui.select.json --count 3
bun run typecheck
```
