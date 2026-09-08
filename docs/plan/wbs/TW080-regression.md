# TW080 Regression / release readiness

## Status

**DONE**（`bun run check` 成功。119 tests / typecheck / build）

## Goal

wavetable32 完了条件をフル検証する。新機能は追加しない。欠けていれば同一リポジトリの最小修正のみ。

## Dependencies

- TW072

## Files

- 変更は欠陥修正に限る
- テスト不足があれば既存テストファイルへ最小追加

## Implementation

親計画 §19 をチェックリストとして確認する。

- `bun run test:core`
- `bun run test`
- `bun run typecheck`
- `bun run build`
- 既存 12 preset が従来どおり render できる
- 44.1kHz / 48kHz で wavetable pitch が破綻しない（周期が周波数に対して妥当）
- cache 併用
- invalid length 拒否
- missing wavetable 安全
- 公開ドキュメントが実装と一致

## Acceptance Criteria

- [x] 上記コマンドがすべて成功
- [x] 既存5波形 regression なし
- [x] §19 の未達項目が残っていない。残るなら BLOCKED 理由を書く

## Verification

```bash
bun run check
```

## Out of Scope

- 新波形
- 補間
- AudioWorklet
