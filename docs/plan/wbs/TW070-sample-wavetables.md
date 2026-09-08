# TW070 sample wavetables / demo presets

## Status

**DONE**（レビュー済み。authoring ラベルは BuiltinPresetName 型合わせの最小変更）

## Goal

named reference 用のサンプル波形 3 種と、それを参照する demo preset を追加する。example UI と README 本文は次タスク。

## Dependencies

- TW060

## Files

- 作成: `wavetables/sineish.json`, `wavetables/metallic.json`, `wavetables/hollow.json`
- 作成: `presets/wavetable.sineish.json`, `presets/wavetable.metallic.json`, `presets/wavetable.hollow.json`（名前は既存 preset 規約に合わせてもよい）
- 変更: `src/presets.ts`（builtin に追加する場合のみ）、対応テスト

## Implementation

- 1 ファイル = 32 個の 0..255 整数（JSON 配列、または `{ "samples": [...] }`。採用した形をテストで固定）
- 最低 3 種: Sine-ish / Metallic / Hollow
- preset は `waveform: "wavetable32"` + `wavetable` 名前参照。32 要素を preset に埋め込まない
- 既存 12 preset は変更しない
- ローダは長さ不正を拒否する

エンジンがファイルを自動ロードしないなら、preset JSON と wavetable JSON をテストから読み、`registerWavetable` + `validatePatch` で結合するヘルパを最小追加してよい。builtin 自動登録にする場合は `createSfxEngine` が 3 種を登録すること。

推奨: builtin demo preset として公開し、エンジン初期化時に対応 wavetable を登録する。そうしないと名前解決できない。

## Acceptance Criteria

- [x] 3 つの 32-sample ファイルがある
- [x] 3 つの named wavetable preset がある
- [x] 既存 12 preset が従来どおり validate / render できる
- [x] 不正長の wavetable JSON を拒否するテストがある

## Verification

```bash
bun run test
bun run typecheck
```

## Out of Scope

- example UI の試聴ボタン
- README 長文
- 波形エディタ
