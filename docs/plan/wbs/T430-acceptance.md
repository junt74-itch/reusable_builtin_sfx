# T430 受け入れ検証

## Status

**DONE**

## Depends on

- T140 T150 T340 T410 T420

## Goal

親計画 §21 の受け入れ条件をチェックリストとして実証する。足りないテストだけ足す。新機能は足さない。

## Out of scope

- Phase 5
- 新 DSP

## Files

- 変更: `tests/acceptance.test.ts`
- `package.json` の `check` は `test` 経由で `test:core` を含む（変更不要）

## Spec

確認してチェックを README か本ファイルの完了報告に残す:

- [x] `bun run build:wasm` 成功（`tests/acceptance.test.ts` + `bun run check`）
- [x] `bun run build` 成功（`bun run check`）
- [x] WASM から Float32 PCM 取得
- [x] Web Audio で再生（`AudioBackend` テスト + vanilla / Phaser は手動確認）
- [x] Phaser 4 例で複数 SE（example ソース検証 + 手動確認）
- [x] 同一 Patch+Seed で同一結果
- [x] 44100 / 48000 で時間・pitch が破綻しない（`test:core` + acceptance TS テスト）
- [x] preset を外部 JSON から追加可能
- [x] game が C++/Emscripten を知らなくてよい
- [x] cache が効く
- [x] dispose で解放、その後安全
- [x] README 最小サンプルで導入可能

失敗項目があれば **新タスクにせず、該当タスク番号を挙げて戻る。**

## Verify

```bash
bun run check
```

手動（2026-08-30 確認済み）:

- `bun run dev` → vanilla 5 ボタンで SE 再生
- `bun run dev:phaser` → Phaser 4 例で 5 アクション再生
