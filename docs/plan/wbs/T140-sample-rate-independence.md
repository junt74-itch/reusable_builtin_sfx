# T140 sampleRate 非依存

## Status

**DONE**

## Depends on

- T130

## Goal

44100 と 48000 で、音の長さ（秒）とピッチが破綻しないことをテストで固定する。これが本リポジトリの中心要件の一つ。

## Out of scope

- 新エフェクト
- ビット完全一致（リサンプリングなので波形のサンプル列は一致しなくてよい）

## Files

- 変更: `core/tests/test_runner.cpp`
- 必要なら: `core/src/*.cpp` の 44100 定数除去のみ

## Spec

パッチ例: sine, 440Hz, attack=0, sustain=0.05, decay=0.05, 他 0。

1. 長さ: `|n44/44100 - n48/48000| < 2ms`
2. ピッチ: ゼロクロス間隔から推定した周波数が両方とも 440Hz ± 2%
3. ソースに `44100` が「デフォルト sampleRate」以外で残っていない（テスト入力としての 44100 は可）
4. 22050 でも長さ（秒）が同様

ゼロクロス法で十分。FFT は不要。

## Acceptance Criteria

- [x] 上記 1–3 のテストが `test:core` に含まれる
- [x] `rg 44100 core/src core/include` がテスト以外でヒットしない（ヒットしたら理由をコメント）

## Verify

```bash
bun run test:core
bun run build:wasm
```
