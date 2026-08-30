# T420 README 導入手順

## Status

**DONE**

## Depends on

- T340 T400 T410

## Goal

別ゲームが最小サンプルだけで導入できる README にする。Bfxr 移植であるかの誤解を解く。

## Out of scope

- 実装変更（誤記修正以外）
- Phase 5 CLI を本完成扱いにしない

## Files

- 変更: `README.md`

## Spec

含めること:

- 目的（再利用可能な procedural SFX、WASM を隠す）
- 必要環境（Bun、Emscripten 6.0.8、`bun run setup:emsdk`）
- `bun install` から `bun run dev` / `bun run check`
- ゲームへの最小コード（`createSfxEngine` + `play`）
- Phaser 4 例の起動方法
- 非目標（UI 完全再現、ファイル互換、AudioWorklet）
- ライセンス Notices へのリンク
- Composer 向け WBS へのリンクは短くてよい

## Acceptance Criteria

- [x] 最小サンプルが README だけでコピーできる
- [x] npm/yarn/pnpm 手順が無い

## Verify

```bash
bun run check
```
