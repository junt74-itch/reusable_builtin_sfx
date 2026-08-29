# T320 Preset ローダ

## Depends on

- T020 T340 は未完でも型は使ってよい。**T320 は T340 より前でも可** だが、Engine への接続は T340 で行うなら、本タスクはローダ関数と JSON だけにすること

推奨: ローダ単体を本タスク、Engine 接続は T340。

## Goal

preset を JSON または TS object から読み、名前（`ui.select` など）で引ける。ゲーム側から上書き可能。

## Out of scope

- 再生
- Bfxr ファイル形式

## Files

- 作成: `src/presets.ts`, `presets/ui.select.json` など 12 個前後, `tests/presets.test.ts`
- 変更: なし必須（Engine 接続は T340 でも可。接続するなら `SfxEngine.ts` の presets 初期値を差し替え）

## Spec

MVP 名:

```text
ui.select ui.cancel ui.confirm
item.pickup item.coin
player.jump player.damage
enemy.hit weapon.shot explosion.basic
powerup warning
```

- JSON は `SfxPatchV1` を `validatePatch` する
- `loadPresets(json): Record<string, SfxPatchV1>`
- マージ: `{ ...builtin, ...override }`
- 未知 waveform の JSON は throw
- 音の中身は仮でよい（sine の短いビープでも、T130 後なら envelope 付き）。「それっぽさ」は後で調整してよい

## Acceptance Criteria

- [ ] 12 個以上の名前がある
- [ ] 外部 JSON 上書きテストがある
- [ ] ライブラリが Phaser に依存しない

## Verify

```bash
bun test tests/presets.test.ts
bun run typecheck
```
