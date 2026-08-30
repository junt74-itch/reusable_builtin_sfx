# T510 作者向け GUI（ガチャ + 履歴）

## Status

**DONE**

## Depends on

- T340 T350 T500

## Goal

ブラウザでカテゴリ（12 builtin preset）を選び、mutate ガチャで鳴らし、履歴から patch をコピペできる作者向け画面を足す。vanilla / Phaser 演示は残す。

## Out of scope

- スライダ微調整（T520）
- WAV（T530）
- CLI（T540）
- Phaser import
- `src/` への DOM
- Bfxr レイアウト

## Files

- 作成: `examples/authoring/index.html`, `examples/authoring/main.ts`, `examples/authoring/style.css`, `vite.authoring.config.ts`
- 変更: `package.json`（`dev:authoring`）、`tsconfig.json`、`README.md`

## Spec

- `bun run dev:authoring` → `http://localhost:5175/`
- カテゴリ: `BUILTIN_PRESET_NAMES`（初期 `ui.select`）
- 揺れ幅: Light / Medium / Heavy（amount 0.2 / 0.45 / 0.75）
- **引く**: `mutatePatch(builtin[name], { amount, seed: 乱数 u32 })` → `sfx.play(patch)` → 履歴先頭
- 履歴 1 行: カテゴリ、mutate seed、Replay、Copy JSON、Copy TS、Favorite
- Copy JSON: `SfxPatchV1` 整形
- Copy TS: `await sfx.play({ ... })`
- 履歴は `localStorage`、上限 50
- 再生は patch 直指定。render seed は 0
- Phaser を import しない。`bun run dev` / `dev:phaser` は変えない

## Acceptance Criteria

- [x] `dev:authoring` で画面が開く
- [x] `src/` に DOM / Phaser が無い
- [x] `bun run typecheck` が examples を含んだまま通る
- [x] README に起動方法がある

## Verify

```bash
bun run typecheck
bun run dev:authoring
```

ブラウザでカテゴリを選び、引く → 再生 → 履歴から Replay / Copy できることを確認する。
