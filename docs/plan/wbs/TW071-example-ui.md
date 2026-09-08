# TW071 example UI

## Status

**DONE**（レビュー済み。vanilla をブラウザでクリック確認、JS エラーなし）

## Goal

既存 example で wavetable32 を同一 pitch の Sine / Triangle と比較試聴できるようにする。エディタは作らない。

## Dependencies

- TW070

## Files

- 変更: `examples/vanilla/main.ts`（必要なら HTML/CSS）
- 任意: `examples/phaser4/main.ts` には足さなくてよい。vanilla を正とする
- 変更: `examples/vanilla` 向け README があれば最小追記

## Implementation

最低ボタン:

```text
Sine (440)
Triangle (440)
Wavetable Sine-ish
Wavetable Metallic
Wavetable Hollow
```

- 同一 `baseFrequency`（440）で試聴する
- 既存 preset ボタンを消さない
- 32-sample 値の簡易表示は任意。エディタ UI は禁止
- AudioContext resume の既存パターンを踏襲する

## Acceptance Criteria

- [x] vanilla example から wavetable 3 種を鳴らせる
- [x] 比較用 Sine / Triangle も同一 pitch で鳴らせる
- [x] 既存 demo ボタンが残っている
- [x] `bun run build` が通る

## Verification

```bash
bun run typecheck
bun run build
```

ブラウザでのクリック確認はレビュー担当が行う。Composer はビルドが通ることを報告する。

## Out of Scope

- wavetable エディタ
- authoring GUI のスライダ追加
- Phaser 4 example 必須化
