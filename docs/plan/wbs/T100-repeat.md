# T100 Repeat

## Depends on

- T070

## Goal

`repeatSpeed`（回/秒）で、周波数などの進行時刻を折り返すローカル時間を返す。

## Out of scope

- `render()` 置換
- arp / change amount（Patch に無い）

## Files

- 作成: `core/include/sfx_repeat.hpp`, `core/src/repeat.cpp`
- 変更: `core/tests/test_runner.cpp`

## Spec

```cpp
float repeat_local_time(float timeSec, float repeatSpeed);
```

- `repeatSpeed <= 0` なら `timeSec` をそのまま
- period = `1 / repeatSpeed`
- `local = fmod(timeSec, period)`
- エンベロープはグローバル時間のまま（T130 で、repeat は周波数・duty・フィルタにだけ効かせる）。このタスクでは local time 関数だけ

## Acceptance Criteria

- [ ] speed=0 で入力と一致
- [ ] speed=2 なら 0.0 と 0.5 が同じ local time

## Verify

```bash
bun run test:core
```
