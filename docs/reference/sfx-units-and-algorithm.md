# SFX 単位系とアルゴリズム契約

Composer 2.5 は本ファイルを DSP タスクの正とする。Bfxr 完全互換は目標にしない。参照実装のスライダー空間（0..1）を Public API に出さない。

## 独立実装の原則

- 時間は **秒**
- 周波数は **Hz**
- `sampleRate` は render ごとに必ず受け取る
- 44100 を定数として時間や周期に使わない
- 乱数は `std::rand()` 禁止。seed 必須
- 同一 `Patch + Seed + SampleRate` は同一 PCM
- WASM は PCM だけ返す。再生は TypeScript

## SfxPatchV1 単位

| フィールド | 単位 | 意味 |
| --- | --- | --- |
| `waveform` | enum | square / saw / sine / triangle / noise / wavetable32 |
| `wavetable` | 名前参照 | `waveform: "wavetable32"` 時に使用。省略可。指定時は名前解決が `wavetableId` より優先 |
| `wavetableId` | 整数 | WASM 側 wavetable bank の ID。省略時 0 |
| `baseFrequency` | Hz | 開始周波数 |
| `frequencySlide` | octave / s | 指数スライド。`f(t) = f0 * 2^(slide * t)` |
| `frequencyDeltaSlide` | octave / s² | スライドの変化。`slide(t) = slide0 + delta * t` |
| `attack` | s | 0 → 1 |
| `sustain` | s | 1 を保持 |
| `decay` | s | 1 → 0 |
| `vibratoDepth` | 0..1 | `f' = f * (1 + depth * sin(2π * speed * t))` |
| `vibratoSpeed` | Hz | ビブラート速度 |
| `duty` | 0..1 | square / saw のデューティ |
| `dutySweep` | 1/s | duty の変化 |
| `repeatSpeed` | 1/s | 0 でオフ。周期ごとに周波数などを初期値へ戻す |
| `lowPassCutoff` | 0..1 | 1 でオープン（無効） |
| `lowPassSweep` | 1/s | LP cutoff の変化 |
| `highPassCutoff` | 0..1 | 0 で無効 |
| `highPassSweep` | 1/s | HP cutoff の変化 |
| `phaserOffset` | 0..1 | ディレイ量 |
| `phaserSweep` | 1/s | offset の変化 |
| `masterVolume` | 0..1 | コア内ゲイン |

## エンベロープ

ADSR の R は持たない。A-S-D のみ。

- 総時間 `T = attack + sustain + decay`（下限 1ms）
- 出力フレーム数 `round(T * sampleRate)`
- 44100 と 48000 で `T` が大きく変わってはならない

## オシレータ

位相は秒と Hz から進める。`phase += frequency / sampleRate`。

- square: duty 未満で +0.5、それ以外 -0.5
- saw: duty で折れ線（jsfxr 相当の形状でよいが、時間は秒単位）
- sine: `sin(2π * phase)`
- triangle: 位相から三角波
- noise: seed 付き PRNG。周波数で更新周期を変える
- wavetable32: 1 周期 32 サンプル `uint8`（0..255）。`sample/127.5-1` で -1..+1 にデコード。nearest-neighbor。`index = int(wrap_phase(phase) * 32) & 31`。波形データは Patch とは別の bank に登録し、`wavetableId` で参照する

8x oversampling は必須ではない。入れるなら output sampleRate に対する倍率とし、44100 固定にしない。

## WASM ABI

`SFX_PACKED_FLOAT_COUNT = 21`。`packed[20]` は `wavetableId`（整数を float として格納、省略時 0）。並びは `core/include/sfx_patch.hpp` と `src/types.ts` の `packPatch` が正。順序を変えるときは両側とテストを同時に更新する。WASM `render_patch` は `packed_len == 20`（旧、`wavetableId = 0`）または `21` を受理する。

```
create_context()
destroy_context()
render_patch(packed, sample_rate, seed) -> Float32 PCM
register_wavetable(ctx, id, data, length) -> int   // length == 32, 成功 1
unregister_wavetable(ctx, id) -> int                 // 成功 1
clear_wavetables(ctx)
```

`render_patch` の `packed` は 20 要素（旧 ABI、`wavetableId = 0`）または 21 要素（`packed[20]` = `wavetableId`）を受理する。TypeScript 側は `wavetable` 名前を解決してから pack する。

PCM ポインタは次の render または destroy まで有効。JS は直ちに copy する。

## 参照してよいもの

- jsfxr の波形・フィルタ・フランジャー構造
- Bfxr `SfxrSynth.as` の処理順
- FigBug/bfxr の C++ 分割

## 参照してはいけないもの

- 44100 前提の sample count 変換（`v*v*100000` など）をそのままコピーすること
- Bfxr UI、ファイル互換、全パラメータ互換
- `std::rand()` / 非 seed 乱数
