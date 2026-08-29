# T070 Frequency slide

## Depends on

- T000

## Goal

`baseFrequency` と slide / delta slide から、時刻 t の周波数（Hz）を返す。

## Out of scope

- `render()` 置換
- ビブラート（T080）
- sfxr の「1 サンプルあたり乗算」を 44100 前提のまま移植すること

## Files

- 作成: `core/include/sfx_frequency.hpp`, `core/src/frequency.cpp`
- 変更: `core/tests/test_runner.cpp`

## Spec

単位は octave。

```text
slide(t) = frequencySlide + frequencyDeltaSlide * t
f(t)     = baseFrequency * 2^(slide(t) * t)   の定義はドキュメントに合わせる
```

`docs/reference/sfx-units-and-algorithm.md` では:

```text
f(t) = f0 * 2^(slide * t)
slide(t) = slide0 + delta * t
```

実装は次でよい（連続時間、sampleRate 非依存）:

```text
octaves(t) = frequencySlide * t + 0.5 * frequencyDeltaSlide * t * t
f(t) = baseFrequency * pow(2, octaves(t))
```

- `f` は `(20, 20000)` 程度に clamp
- slide=0, delta=0 なら常に `baseFrequency`
- t=1s, slide=1 なら約 2 倍
- 同じ t なら sampleRate が違っても f は同じ

## Acceptance Criteria

- [ ] 1 octave/s で 1 秒後に周波数が約 2 倍
- [ ] 関数引数に sampleRate を必須としない

## Verify

```bash
bun run test:core
```
