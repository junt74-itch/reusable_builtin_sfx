# T310 AudioBackend 完成

## Depends on

- T300

## Goal

PCM → AudioBuffer → Source → Gain → StereoPanner → master Gain → destination。Patch を解釈しない。

## Out of scope

- WASM
- Phaser API
- AudioWorklet

## Files

- 変更: `src/AudioBackend.ts`
- 作成候補: `tests/audio-backend.test.ts`（モック可）

## Spec

既存クラスを完成させる。

- `play(pcm, sampleRate, volume, pan)` だけが入力
- pan は `-1..1` に clamp
- volume は `>= 0`
- `resume()` は user gesture 後の suspended context 用
- `dispose()` は disconnect + `context.close()`。2 回呼んで安全
- グラフに Bfxr / patch フィールドを出さない

 bun に AudioContext が無い場合は、最小の mock（createGain/createStereoPanner/createBuffer/createBufferSource）で接続順を検証してよい。実聴は T400。

## Acceptance Criteria

- [ ] モックまたは実コンテキストで gain → panner → master の順
- [ ] Patch 型を AudioBackend が import しない

## Verify

```bash
bun test tests
bun run typecheck
```
