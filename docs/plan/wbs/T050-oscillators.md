# T050 Oscillators

## Depends on

- T040

## Goal

5 波形の 1 サンプル生成。位相は 0..1。sampleRate は呼び出し側が位相増分で扱う。

## Out of scope

- `render()` 置換（T130）
- フィルタ、ビブラート、エンベロープ
- 44100 決め打ちの phase increment

## Files

- 作成: `core/include/sfx_oscillators.hpp`, `core/src/oscillators.cpp`
- 変更: `core/tests/test_runner.cpp`

## Spec

```cpp
float oscillator_sample(SfxWaveform wave, float phase, float duty, SfxRng& rng);
```

- `phase` は `[0, 1)` に wrap してから使う
- square: `phase < duty` なら `+0.5`、否则 `-0.5`
- saw: jsfxr と同様、duty で折れ線。duty は `(0, 1)` に clamp
- sine: `sin(2π * phase)`、`<cmath>`、duty 無視
- triangle: 位相から `-1..1` の三角波、duty 無視
- noise: 毎サンプル独立ではなく、呼び出し側が「更新したときだけ」rng を使う設計でもよい。その場合 `noise_sample(SfxRng&)` を分け、周期は T130 で `frequency` から決める
- 出力は概ね `[-1, 1]`
- sine(phase=0) は 0 に近い、sine(phase=0.25) は 1 に近い、などの数値テスト

## Acceptance Criteria

- [ ] 5 波形がテストされている
- [ ] テストに `44100` ハードコードの正解テーブルを必須にしない（位相指定で検証）
- [ ] `render()` はまだ無音のままでよい

## Verify

```bash
bun run test:core
bun run build:wasm
```
