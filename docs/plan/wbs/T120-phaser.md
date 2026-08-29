# T120 Phaser

## Depends on

- T000

## Goal

短いディレイ加算の phaser/flanger。offset は 0..1。

## Out of scope

- `render()` 置換
- ステレオ

## Files

- 作成: `core/include/sfx_phaser.hpp`, `core/src/phaser.cpp`
- 変更: `core/tests/test_runner.cpp`

## Spec

円環バッファ（1024 sample 程度）。

```cpp
float apply_phaser(float sample, PhaserState& state, float offset, float sweepAccum, int sampleRate);
```

- offset=0 かつ sweep=0 ならほぼ dry（または wet=0）
- delay サンプル数は `offset` と **sampleRate** から決める。`1020` を 44100 専用の魔法数として直書きしない
- 最大遅延は 10ms 程度に収め、sampleRate が変わっても「秒」が概ね保たれる

## Acceptance Criteria

- [ ] offset=0 で入力と大きく違わない
- [ ] offset>0 でインパルス応答が遅延成分を持つテストがある

## Verify

```bash
bun run test:core
```
