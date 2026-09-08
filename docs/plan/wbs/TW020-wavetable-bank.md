# TW020 WavetableBank

## Status

**DONE**（レビュー済み / `bun run test:core` 成功）

## Goal

整数 ID で 32-sample 波形を登録・参照・削除する軽量 registry を C++ に追加する。synth / ABI / WASM には接続しない。

## Dependencies

- TW010

## Files

- 変更: `core/include/sfx_wavetable.hpp`, `core/src/wavetable.cpp`, `core/tests/test_runner.cpp`

## Implementation

```cpp
class WavetableBank {
 public:
  bool register_wavetable(int id, const std::uint8_t* samples, int length);
  bool unregister_wavetable(int id);
  bool has_wavetable(int id) const;
  const Wavetable32* get_wavetable(int id) const;
  void clear_wavetables();
  int size() const;
};
```

規則（TW000 D3）:

- ID は `>= 0`
- `length` は必ず 32。それ以外は `false` を返し変更しない
- `samples == nullptr` は `false`
- 同一 ID 再登録はコピー上書きして `true`
- 登録時に 32 byte を bank 内へコピーする
- 未登録 `get_wavetable` は `nullptr`
- 未登録 `unregister` は `false`
- 登録上限 256。超過の新規 ID は `false`（既存 ID 上書きは可）
- グローバル / 静的 bank を作らない
- `render()` / bindings / TypeScript を変更しない

## Acceptance Criteria

- [x] 32 byte 登録後に `has` / `get` が成功し、中身が一致する
- [x] length 31 / 33 / nullptr を拒否する
- [x] 負 ID を拒否する
- [x] 再登録で上書きされる
- [x] unregister / clear 後は lookup が失敗する
- [x] 257 個目の新規 ID は失敗する
- [x] 登録済みデータを呼び出し側バッファ破壊後も保持する（コピーの証明）
- [x] TW010 の primitive テストが残る

## Verification

```bash
bun run test:core
```

## Out of Scope

- `SfxWaveform::Wavetable32`
- synth routing
- Patch `wavetableId`
- WASM / TypeScript API
