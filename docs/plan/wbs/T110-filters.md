# T110 Filters

## Depends on

- T000

## Goal

1 次の low-pass / high-pass。cutoff は 0..1 の正規化（1=LP 無効、0=HP 無効）。係数は sampleRate から決める。

## Out of scope

- `render()` の全体置換（フィルタ関数だけ）
- Biquad / FFT
- resonance を必須にしない（入れても Patch に無ければ 0 固定）

## Files

- 作成: `core/include/sfx_filters.hpp`, `core/src/filters.cpp`
- 変更: `core/tests/test_runner.cpp`

## Spec

jsfxr の 1 次 LP/HP を **秒と sampleRate** に直した形でよい。禁止なのは `44100` 埋め込み。

```cpp
struct FilterState { float lp; float hp; float lpd; };

float apply_filters(
    float sample,
    FilterState& state,
    float lowPassCutoff,
    float highPassCutoff,
    int sampleRate);
```

- `lowPassCutoff >= 0.99` なら LP バイパス相当
- `highPassCutoff <= 0.001` なら HP バイパス相当
- DC の sine 低周波は HP で落ち、LP は高周波を落とす、といった粗いテストでよい
- sweep は T130 で cutoff を毎サンプル更新する。本タスクは 1 サンプル分

## Acceptance Criteria

- [ ] sampleRate 引数がある
- [ ] 44100 定数なし
- [ ] cutoff 全開で入力に近い（誤差はテストで閾値）

## Verify

```bash
bun run test:core
```
