# T130 Render 統合

## Status

**DONE**

## Depends on

- T040 T050 T060 T070 T080 T090 T100 T110 T120

## Goal

`render()` の無音スタブを、上記モジュールを繋いだ実 PCM 生成に置き換える。WASM ABI は変えない。

## Out of scope

- TypeScript Public API の再設計
- CLI / WAV
- Bfxr 全パラメータ

## Files

- 変更: `core/src/sfx_synth.cpp`, `core/include/sfx_synth.hpp`, `core/tests/test_runner.cpp`
- 触ってよいが順序変更禁止: `core/include/sfx_patch.hpp`, `wasm/bindings.cpp`

## T120 レビューからの配線注意

既存関数名をそのまま使う。新しい DSP を発明しない。

```text
f = frequency_at_time(tLocal, baseFrequency, frequencySlide, frequencyDeltaSlide)
f = apply_vibrato(f, tLocal, vibratoDepth, vibratoSpeed)
duty = duty_at_time(tLocal, duty, dutySweep)   // square もこれを通す（oscillator 側は duty を clamp しない）
lp = clamp(lowPassCutoff + lowPassSweep * tLocal, 0, 1)
hp = clamp(highPassCutoff + highPassSweep * tLocal, 0, 1)
sweepAccum = phaserSweep * tLocal
```

- `FilterState` / `PhaserState` は **render 1 回につき 1 つ**。ループ内で作り直さない
- **Noise**: `oscillator_sample(Noise, ...)` は毎サンプル `rng` を回す。ピッチ感のあるノイズにするなら、位相が 1 を超えて wrap したときだけ `noise_sample(rng)` を更新し、それ以外は直前の値を使う
- エンベロープだけグローバル `t`。repeat は周波数・duty・filter・phaser にだけ効かせる
- `sampleRate` を時間計算の定数にしない。`phase += f / sampleRate`

## Spec

1 サンプルループ（疑似）:

```text
T = max(0.001, attack+sustain+decay)
n = round(T * sampleRate)
for i in 0..n-1:
  t = i / sampleRate
  tLocal = repeat_local_time(t, repeatSpeed)  // 周波数・duty・filter 用
  f = frequency_at_time(...)
  f = apply_vibrato(...)
  duty = duty_at_time(...)
  phase += f / sampleRate
  s = oscillator_sample(...)  // Noise は上の注意
  s = apply_filters(s, filterState, lp, hp, sampleRate)
  s = apply_phaser(s, phaserState, phaserOffset, sweepAccum, sampleRate)
  s *= envelope_gain(t, attack, sustain, decay)
  s *= masterVolume
  pcm[i] = clamp(s, -1, 1)
```

- `sampleRate <= 0` は空 vector（既存）
- seed は `SfxRng` に渡す（noise）
- 同一 patch+seed+rate は同一 PCM
- sine + 無変調で無音にならないこと（振幅の RMS > 0）

## Acceptance Criteria

- [x] 無音スタブが消えている
- [x] sine 440Hz, A=0,S=0.1,D=0.1, volume=0.5 で RMS が十分大きい
- [x] packed ABI 20 float のまま `bun run build:wasm` が通る
- [x] TS toolchain テストがまだ通る（長さはエンベロープ由来）

## Verify

```bash
bun run test
bun run typecheck
bun run build
```
