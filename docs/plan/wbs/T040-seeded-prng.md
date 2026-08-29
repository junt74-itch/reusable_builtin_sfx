# T040 Seeded PRNG

## Status

**DONE**

## Depends on

- T000

## Goal

C++ の `SfxRng` を決定的 PRNG にする。同一 seed は同一系列。`std::rand()` 禁止。

## Out of scope

- オシレータ・エンベロープ
- `render()` の無音スタブ置換（T130）
- WASM 境界の変更

## Files

- 変更: `core/include/sfx_rng.hpp`, `core/src/rng.cpp`, `core/tests/test_runner.cpp`

## Spec

xorshift32（または同等の 32bit 明示 PRNG）。

```text
state ^= state << 13
state ^= state >> 17
state ^= state << 5
```

- コンストラクタの seed を内部 state にする
- seed `0` は `1` に置換してよい（ゼロ状態で固まるのを防ぐ）
- `next_u32()` を公開してよい
- `next_float()` は `[0, 1)`
- 同じ seed で最初の 16 値が一致するテスト
- 違う seed で系列が異なるテスト
- ヘッダに「Web Audio 非依存」以外の余計な API を足さない

## Acceptance Criteria

- [x] `std::rand` / `rand()` / `<cstdlib>` 乱数なし
- [x] 同一 seed で `next_float` が一致
- [x] プレースホルダの定数 `0.5` 連発が消えている

## Verify

```bash
bun run test:core
```
