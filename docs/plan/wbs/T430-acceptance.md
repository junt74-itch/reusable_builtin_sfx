# T430 受け入れ検証

## Depends on

- T140 T150 T340 T410 T420

## Goal

親計画 §21 の受け入れ条件をチェックリストとして実証する。足りないテストだけ足す。新機能は足さない。

## Out of scope

- Phase 5
- 新 DSP

## Files

- 変更候補: `tests/acceptance.test.ts`, `package.json` の `check` スクリプトが core テストを含むこと

## Spec

確認してチェックを README か本ファイルの完了報告に残す:

- [ ] `bun run build:wasm` 成功
- [ ] `bun run build` 成功
- [ ] WASM から Float32 PCM 取得
- [ ] Web Audio で再生（vanilla または Phaser、手動可）
- [ ] Phaser 4 例で複数 SE
- [ ] 同一 Patch+Seed で同一結果
- [ ] 44100 / 48000 で時間・pitch が破綻しない
- [ ] preset を外部 JSON から追加可能
- [ ] game が C++/Emscripten を知らなくてよい
- [ ] cache が効く
- [ ] dispose で解放、その後安全
- [ ] README 最小サンプルで導入可能

失敗項目があれば **新タスクにせず、該当タスク番号を挙げて戻る。**

## Verify

```bash
bun run check
```
