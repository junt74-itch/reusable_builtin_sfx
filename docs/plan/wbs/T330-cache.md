# T330 Cache

## Depends on

- T300 T320（preset 名をキーにするなら T320 後が楽）

## Goal

`preset名 + seed + sampleRate` で AudioBuffer または PCM をキャッシュする。`clearCache()` で破棄。

## Out of scope

- LRU の高度な実装（無制限 Map でよい。上限を付けるなら 256 件程度）
- ディスクキャッシュ

## Files

- 作成: `src/cache.ts`, `tests/cache.test.ts`
- 変更: `src/SfxEngine.ts`

## Spec

キー: `${name}|${seed}|${sampleRate}`。Patch オブジェクト直接 play のときはキャッシュしなくてよい（または JSON 安定キー。省略可と明記）。

- `preload(names)` は各 name を seed=0 と現在 sampleRate で生成して格納
- 2 回目の `play` / `render` が同じキーなら WASM を再呼び出ししない
- `clearCache()` 後は再生成
- dispose 時に cache も捨てる

AudioBuffer をキャッシュする場合、bun に AudioContext が無いので PCM (`Float32Array`) キャッシュにして、再生時に Buffer 化する方がテストしやすい。

## Acceptance Criteria

- [ ] 同一キーで WASM render 回数が 1 回になる（Bridge をラップするか、カウンタをテスト用に注入）
- [ ] clearCache 後に再生成される
- [ ] キーに sampleRate が含まれる

## Verify

```bash
bun test tests/cache.test.ts
bun run typecheck
```
