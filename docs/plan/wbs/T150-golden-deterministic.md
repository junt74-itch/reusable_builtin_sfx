# T150 Golden / 決定性

## Status

**DONE**

## Depends on

- T140

## Goal

同一 Patch + Seed + SampleRate の PCM が安定していることを、ハッシュまたは生配列比較で固定する。

## Out of scope

- ブラウザ再生
- ハッシュ値をコミットして浮動小数の環境差で CI が落ちるなら、相対誤差比較に切り替えてよい。ただし **同一プロセス内の 2 回 render は完全一致** 必須

## Files

- 変更: `core/tests/test_runner.cpp`
- 作成候補: `tests/golden.test.ts`（WASM 経由の同一条件）

## Spec

- C++: `render(p, 48000, 12345)` を 2 回、全サンプル一致
- C++: seed を変えると一致しない（noise または微小差。sine 無ノイズでも位相は同じなので、noise 波形のパッチを使う）
- TS: `sfx.render(patch, { seed, sampleRate })` を 2 回、配列一致
- 簡易 FNV-1a や 16 サンプルのスナップショットをテストに書いてよい。スナップショットは「回帰検知」用であり Bfxr 一致ではない

## Acceptance Criteria

- [x] 決定性テストが C++ と TS の両方にある
- [x] noise + seed 違いのテストがある

## Verify

```bash
bun run test
```
