# TW010 C++ Wavetable32 primitive

## Status

**DONE**（レビュー済み / `bun run test:core` 成功）

## Goal

8-bit / 32-sample 波形の型、uint8→float 正規化、nearest-neighbor 位相 lookup を C++ 単体で追加する。Bank・synth・ABI・WASM・TypeScript は触らない。

## Dependencies

- TW000

## Files

- 作成: `core/include/sfx_wavetable.hpp`, `core/src/wavetable.cpp`
- 変更: `core/tests/test_runner.cpp`

## Implementation

```cpp
inline constexpr int SFX_WAVETABLE32_SIZE = 32;
using Wavetable32 = std::array<std::uint8_t, 32>;

float wavetable32_decode(std::uint8_t sample);
int wavetable32_index(float phase);
float wavetable32_sample(const Wavetable32& table, float phase);
```

規則（TW000 D2）:

- `wavetable32_decode(sample) = sample / 127.5f - 1.0f`
- `wavetable32_index` は既存 `wrap_phase` を使い、`int(wrap_phase(phase) * 32.0f) & 31`
- `wavetable32_sample` は decode(table[index])
- 補間しない
- `oscillator_sample` を変更しない
- `SfxWaveform` / `SfxPatch` / pack を変更しない

`scripts/build-wasm.ts` と `scripts/test-core.ts` は `core/src/*.cpp` を自動収集する。新規 cpp をスクリプトに足さない。

## Acceptance Criteria

- [x] `Wavetable32` が 32 byte 固定
- [x] uint8 `0` → およそ `-1.0`
- [x] uint8 `128` → およそ `0.0`（許容誤差 0.01 以内）
- [x] uint8 `255` → `+1.0`
- [x] phase `0.0` は index `0`
- [x] phase が `1.0` に近い値（例: `0.999`）は index `31`
- [x] 負位相・`1.0` 以上は wrap してから index する
- [x] 同一 table + 同一 phase は決定的
- [x] 既存 oscillator / pack テストが回帰しない

## Verification

```bash
bun run test:core
```

## Out of Scope

- WavetableBank
- `SfxWaveform::Wavetable32`
- `render()` 変更
- Patch ABI / TypeScript / WASM
- 補間
