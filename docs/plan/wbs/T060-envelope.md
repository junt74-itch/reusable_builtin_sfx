# T060 Envelope

## Depends on

- T000

## Goal

A-S-D エンベロープを秒単位で計算する。sample count ではなく時間。

## Out of scope

- `render()` 置換
- punch / release（SfxPatchV1 に無い）
- sfxr の `v*v*100000` 変換の移植

## Files

- 作成: `core/include/sfx_envelope.hpp`, `core/src/envelope.cpp`
- 変更: `core/tests/test_runner.cpp`

## Spec

```cpp
float envelope_gain(float timeSec, float attack, float sustain, float decay);
```

- `t < 0` → 0
- attack 区間: 0 → 1 の線形
- sustain 区間: 1
- decay 区間: 1 → 0 の線形
- `t >= attack+sustain+decay` → 0
- attack=0 なら t=0 は sustain 開始（gain=1、sustain も 0 なら decay へ）
- すべて 0 のときは 0

44100 と 48000 で、同じ `t`（秒）なら同じ gain になるテストを書く。

## Acceptance Criteria

- [ ] 秒で検証している（sample index ではない）
- [ ] 44100 定数が関数内に無い

## Verify

```bash
bun run test:core
```
