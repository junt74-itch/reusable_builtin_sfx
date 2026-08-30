# T530 WAV export

## Status

**DONE**

## Depends on

- T340 T510

## Goal

作者向け画面から、現在または履歴 1 件の PCM を 16-bit WAV としてダウンロードする。sampleRate は AudioContext（または engine の sampleRate）。

## Out of scope

- CLI（T540）
- バッチ書き出し
- 新しい DSP
- AudioWorklet

## Files

- 作成: `src/wav.ts`（PCM → WAV の純関数。DOM なし）, `tests/wav.test.ts`
- 変更: `src/index.ts`, `examples/authoring/main.ts`

## Spec

- `encodeWavPcm16(pcm: Float32Array, sampleRate: number): ArrayBuffer`（または `Uint8Array`）
- モノラル 16-bit PCM。`pcm` は -1..1 を clamp
- `sampleRate` は引数。44100 を定数にしない
- GUI: 選択中 / 履歴行に Download WAV。`sfx.render(patch)` の結果を使う
- Public API に `HEAPF32` を出さない

## Acceptance Criteria

- [x] 同一 PCM + sampleRate でバイト列が一致するテスト
- [x] RIFF / WAVE / fmt / data チャンクがある
- [x] GUI から 1 ファイル落ちる
- [x] `bun run typecheck` が通る

## Verify

```bash
bun test tests/wav.test.ts
bun run typecheck
bun run dev:authoring
```
