# TW072 README / reference docs

## Status

**DONE**（レビュー済み。単位表の「排他」表現のみ管理側で修正）

## Goal

wavetable32 の使い方を README と単位系ドキュメントに追記する。API と実装をこれ以上増やさない。

## Dependencies

- TW071

## Files

- 変更: `README.md`
- 変更: `docs/reference/sfx-units-and-algorithm.md`
- 任意: `PROGRESS.md` はレビュー担当が更新するので Composer は触らない

## Implementation

README に短い使用例:

```ts
sfx.registerWavetable("bell", wave);
await sfx.play({
  waveform: "wavetable32",
  wavetable: "bell",
  baseFrequency: 440,
  attack: 0,
  sustain: 0.08,
  decay: 0.15,
});
```

- 32 sample / 0..255 / nearest / Patch と波形メモリ分離を書く
- 非目標（可変長、16-bit、エディタ等）を 1 段落で明示
- 単位系ドキュメントに waveform `wavetable32` と packed[20] `wavetableId`、WASM register API を追記
- 既存導入手順を壊さない

## Acceptance Criteria

- [x] README から register → play まで辿れる
- [x] 単位系ドキュメントが 21-float ABI と 6 波形に同期している
- [x] 実装コードを変更していない

## Verification

```bash
bun run typecheck
```

## Out of Scope

- 新機能
- 作者向け GUI
- 長文の設計再掲
