# T340 SfxEngine Public API

## Status

**DONE**

## Depends on

- T020 T300 T310 T320 T330

## Goal

計画書の Public API を完成させる。ゲームが C++/Emscripten を知らなくて使える。

## Out of scope

- Phaser 専用メソッド
- CLI

## Files

- 変更: `src/SfxEngine.ts`, `src/index.ts`, `tests/engine.test.ts`

## Spec

```ts
createSfxEngine(options?: CreateSfxEngineOptions): Promise<SfxEngine>
play(nameOrPatch, { seed, volume, pan })
render(nameOrPatch, { seed, sampleRate })
preload(names)
clearCache()
setMasterVolume(volume)
dispose()
```

- 未知の preset 名は throw（既存）
- `play` は AudioContext 必須。無ければ明確なエラー
- `render` は Audio 無しでも動く（既存）
- `createSfxEngine({ presets })` で上書きマージ
- 返り値 PCM はコピー済みで、次の render で壊れない

## Acceptance Criteria

- [x] `src/index.ts` の export が上記と型だけ
- [x] engine テストが play なしでも render/preload/dispose をカバー
- [x] 受け入れ条件「game 側が C++/Emscripten 詳細を知らずに利用可能」を export 一覧で満たす

## Verify

```bash
bun run test
bun run typecheck
bun run build
```
