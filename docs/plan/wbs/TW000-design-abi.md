# TW000 Design / ABI 決定

## Status

**DONE**（Grok 4.6 / Phase W0）

## Goal

wavetable32 追加前に、Patch ABI・oscillator 呼び出し・WavetableBank 所有権を確定する。実装は行わない。

## Dependencies

なし。既存 T000–T540 完了後に開始。

## Files

本ファイルが決定の正。関連参照:

- `core/include/sfx_patch.hpp`
- `src/types.ts`
- `wasm/bindings.cpp`
- `docs/plan/wavetable32_IMPLEMENTATION_PLAN.md`

## Implementation

実装なし。以下の決定を後続 TW タスクが守る。

### D1. Patch ABI — 候補A（21-float）+ 後方互換受信

- `SFX_PACKED_FLOAT_COUNT = 21`
- `out[20] = wavetableId`（整数を float として格納）
- **Patch `version` は 1 のまま**。`SfxPatchV2` は作らない
- 既存 JSON preset は変更不要。`wavetableId` は optional、省略時 `0`
- TypeScript `packPatch` は常に 21 float を出す
- WASM `render_patch` は `packed_len == 20`（旧、`wavetableId = 0`）または `21` を受理する。それ以外は現行どおり失敗
- 32 byte 波形本体は Patch ABI に入れない

### D2. oscillator — 専用関数、既存シグネチャは維持

```cpp
float wavetable32_sample(const Wavetable32& table, float phase);
```

- `oscillator_sample(...)` の引数は増やさない（既存5波形テストを壊さない）
- `OscillatorContext` は作らない（MVP で過剰抽象化）
- synth は Noise と同様に分岐する。`Wavetable32` のときだけ bank lookup → `wavetable32_sample`
- nearest-neighbor のみ。補間なし
- 正規化: `static_cast<float>(sample) / 127.5f - 1.0f`
- index: `static_cast<int>(wrap_phase(phase) * 32.0f) & 31`

### D3. WavetableBank — context 所有、グローバル禁止

- C++ は `WavetableBank` を独立クラスとして持つ
- 所有は `SfxContext`（WASM context）。プロセス全域の静的 bank は禁止
- `render()` は任意の bank ポインタを受け取る

```cpp
std::vector<float> render(
  const SfxPatch& patch,
  int sampleRate,
  std::uint32_t seed,
  const WavetableBank* wavetables = nullptr
);
```

- ID は非負整数。登録上限 256。超過は登録失敗
- 同一 ID の再登録は上書き
- 未登録 ID / bank なし / `Wavetable32` 波形: オシレータ出力 `0.0f`（クラッシュ禁止）
- 登録時に 32 byte をコピーする。呼び出し側バッファ寿命に依存しない

### D4. TypeScript 公開面

- 低レベル: 数値 ID で WASM に登録
- 高レベル: 文字列名を許可。TS 側で名前→整数 ID（`0` は未指定、名前付きは `1` から割当）
- 既存5波形 Patch に `wavetable` / `wavetableId` を要求しない

## Acceptance Criteria

- [x] wavetableId 伝達方式が確定（packed[20]、version 1 維持）
- [x] 既存互換方針が確定（JSON 無変更、WASM は 20/21 受理）
- [x] oscillator / bank 所有権が確定

## Verification

設計レビューのみ。コード変更なし。

## Out of Scope

- 任意の実装コード
- 補間、可変長テーブル、Patch v2
