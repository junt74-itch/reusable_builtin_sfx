# T350 volume / pan / dispose

## Depends on

- T340

## Goal

マスターボリューム、パン、破棄の安全を仕上げる。dispose 後に再生も render もしない。

## Out of scope

- 新しい DSP

## Files

- 変更: `src/SfxEngine.ts`, `src/AudioBackend.ts`, `tests/engine.test.ts`

## Spec

- `setMasterVolume` は 0..1 に clamp、master Gain に反映
- play の volume はマスターと独立の per-voice Gain（既存）
- pan は StereoPanner、clamp -1..1
- dispose 後: play/render/preload/setMasterVolume/clearCache は throw
- dispose は冪等
- WASM context も destroy（既存）

## Acceptance Criteria

- [ ] dispose 後の各メソッドテスト
- [ ] volume/pan の clamp テスト（Audio mock 可）

## Verify

```bash
bun run test
bun run typecheck
```
