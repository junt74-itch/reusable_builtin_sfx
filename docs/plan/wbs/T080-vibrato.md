# T080 Vibrato

## Depends on

- T070

## Goal

周波数にビブラートを乗せる。depth は相対、speed は Hz。

## Out of scope

- `render()` 置換
- LFO 波形の追加（sine のみ）

## Files

- 変更または作成: `core/include/sfx_frequency.hpp`, `core/src/frequency.cpp`（または `sfx_vibrato.hpp` / `vibrato.cpp`）
- 変更: `core/tests/test_runner.cpp`

## Spec

```text
f'(t) = f(t) * (1 + depth * sin(2π * speed * t))
```

- depth=0 または speed=0 なら f をそのまま
- depth は 0..1 に clamp、`f'` は正のまま clamp
- 同じ t なら sampleRate 非依存

## Acceptance Criteria

- [ ] depth=0 で入力周波数と一致
- [ ] speed>0, depth>0 で t=0 と t=1/(4*speed) が異なる

## Verify

```bash
bun run test:core
```
