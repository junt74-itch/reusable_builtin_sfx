# T350 volume / pan / dispose

## Depends on

- T340

## Goal

マスターボリューム、パン、破棄の安全を仕上げる。dispose 後に再生も render もしない。

## Out of scope

- 新しい DSP

## Files

- 変更: `src/SfxEngine.ts`, `src/AudioBackend.ts`, `tests/engine.test.ts`

## T340 レビュー時点の現状

すでに入っているもの:

- play の volume は `>= 0`、pan は `-1..1`（`AudioBackend`）
- dispose は冪等。WASM context は destroy 済み
- `clearCache` / `render` は dispose 後に throw

足りないもの:

- `setMasterVolume` は下限 0 のみ。**上限 1 にも clamp** する
- dispose 後の `play` / `preload` / `setMasterVolume` / `clearCache` を engine テストで全部確認する

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
