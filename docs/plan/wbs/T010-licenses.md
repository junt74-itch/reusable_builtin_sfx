# T010 ライセンスと THIRD_PARTY_NOTICES

## Status

**DONE**

## Depends on

- T000

## Goal

参照実装を直接コピーしていない現状を明記し、将来コピーした場合の置き場を固定する。ライセンス文を `licenses/` に保存する。

## Out of scope

- DSP 実装
- Bfxr ソースの vendoring
- 本リポジトリ自身の LICENSE 選定（依頼されない限り触らない）

## Files

- 変更: `THIRD_PARTY_NOTICES.md`
- 作成: `licenses/bfxr2-MIT.txt`, `licenses/bfxr-Apache-2.0.txt`, `licenses/figbug-bfxr-BSD-3-Clause.txt`, `licenses/jsfxr-Apache-2.0.txt`
- 禁止: `core/`, `src/`, `wasm/` のロジック変更

## Spec

1. 各参照リポジトリの公式 LICENSE 本文を取得して `licenses/` に置く（コピーライト行を消さない）
2. `THIRD_PARTY_NOTICES.md` から各ファイルへリンクする
3. 「挙動・数式・設計の参照であり、現時点でソースを取り込んでいない」ことを残す
4. 取り込んだ場合の手順（派生ファイル明示、著作権保持）を短く書く

## Acceptance Criteria

- [x] 4 ライセンス原文がリポジトリ内にある
- [x] Notices が各ファイルを指している
- [x] コードの挙動が変わっていない

## Verify

```bash
bun run test
bun run typecheck
```
