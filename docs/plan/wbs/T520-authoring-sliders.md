# T520 作者向けスライダ

## Status

**DONE**

## Depends on

- T510

## Goal

T510 の作者向け画面で、選択中 patch を単位付きスライダで微調整し、その場で再生できるようにする。履歴へ「手編集」として追加できる。

## Out of scope

- Bfxr レイアウト / 0..1 スライダー空間を Public API に出すこと
- WAV（T530）
- CLI（T540）
- 新しい DSP
- Phaser

## Files

- 変更: `examples/authoring/main.ts`, `examples/authoring/index.html`, `examples/authoring/style.css`
- 禁止: `src/` に DOM を入れること。単位変換を C++ に足すこと

## Spec

- T510 のガチャ / 履歴 / コピーは残す
- 履歴または直前の抽選を「選択中」にする
- 表示するフィールドは `SfxPatchV1`（`docs/reference/sfx-units-and-algorithm.md` の単位: Hz / 秒 / octave/s）
- スライダまたは number 入力の変更で `sfx.play(patch)`（render seed 0）
- waveform は enum 選択。mutate と違い手編集では変えてよい
- 「履歴に追加」で手編集 patch を履歴先頭へ（カテゴリは元の preset 名、seed は空または `edited`）
- Copy JSON / Copy TS は選択中 patch でも使える

## Acceptance Criteria

- [x] 選択中 patch の主要フィールドが見える
- [x] 値を変えると再生される
- [x] 手編集を履歴に足せる
- [x] Bfxr 互換 UI を作っていない
- [x] `bun run typecheck` が通る

## Verify

```bash
bun run typecheck
bun run dev:authoring
```

ガチャで 1 件引き、スライダを動かして音が変わり、履歴追加とコピーができることを確認する。
