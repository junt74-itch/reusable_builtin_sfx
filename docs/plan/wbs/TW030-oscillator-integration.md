# TW030 oscillator integration

## Status

**DONE**（レビュー済み / `bun run test:core` 成功）

## Goal

`SfxWaveform::Wavetable32 = 5` を追加し、synth が bank を参照して wavetable を鳴らす。packed ABI はまだ 20 float のまま。

## Dependencies

- TW020

## Files

- 変更: `core/include/sfx_patch.hpp`, `core/include/sfx_synth.hpp`, `core/src/sfx_synth.cpp`, `core/src/oscillators.cpp`（必要なら宣言のみ `sfx_oscillators.hpp`）、`core/tests/test_runner.cpp`

## Implementation

1. `SfxWaveform::Wavetable32 = 5`
2. `SfxPatch` に `int wavetableId = 0` を追加する。**pack/unpack と `SFX_PACKED_FLOAT_COUNT` は変更しない**
3. `unpack_patch` の waveform 許容を `0..5` にする。不正値は現行どおり Square のまま
4. `render` シグネチャ:

```cpp
std::vector<float> render(
  const SfxPatch& patch,
  int sampleRate,
  std::uint32_t seed,
  const WavetableBank* wavetables = nullptr
);
```

既存呼び出しはデフォルト引数でコンパイル可能なこと。

5. synth 分岐（Noise と同型）:

- `waveform == Wavetable32` のとき `wavetables->get_wavetable(patch.wavetableId)` を見る
- table があれば `wavetable32_sample(*table, phase)`
- bank が null、未登録、または get 失敗なら `0.0f`
- 既存5波形の経路・`oscillator_sample` シグネチャは変えない

C++ テストは `SfxPatch` を直接組み立てる（pack を使わない）。

## Acceptance Criteria

- [x] enum 値 5 が `Wavetable32`
- [x] 登録済み table + `wavetableId` で render が無音でない
- [x] 未登録 ID / bank null でもクラッシュせず、wavetable 成分は 0
- [x] 既存5波形の render / oscillator テストが回帰しない
- [x] packed float 数はまだ 20
- [x] 同一 Patch + Seed + SampleRate + 同一 bank は決定的

## Verification

```bash
bun run test:core
```

WASM / TS を触っていないので `bun test` は必須ではない。既存 WASM 経路は wavetableId を送れないが、既存5波形は壊れてはならない。変更が bindings に波及していないことを目視確認する。

## Out of Scope

- `SFX_PACKED_FLOAT_COUNT` 変更
- TypeScript `packPatch` / `SfxPatchV1`
- WASM register API
- 名前付き registry
- 補間
