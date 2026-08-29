# T090 Duty / duty sweep

## Depends on

- T000

## Goal

時刻 t の duty を計算する。square / saw 用。

## Out of scope

- `render()` 置換
- 波形生成そのもの（T050）

## Files

- 作成: `core/include/sfx_duty.hpp`, `core/src/duty.cpp`（小さく既存ファイルへ足してもよい）
- 変更: `core/tests/test_runner.cpp`

## Spec

```text
duty(t) = clamp(duty0 + dutySweep * t, ε, 1-ε)
```

ε は `0.01` 程度（0/1 で割り算しないため）。

- sweep=0 なら常に duty0（clamp 後）
- 秒単位。sampleRate 不要

## Acceptance Criteria

- [ ] t と sweep から duty が増減する
- [ ] 0 と 1 に張り付いて NaN にならない

## Verify

```bash
bun run test:core
```
