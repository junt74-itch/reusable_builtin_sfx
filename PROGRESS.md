# 進捗

最終更新: 2026-08-30（T430 レビュー済み・MVP 完了）

方針の正は `docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`。  
タスク分割の正は `docs/plan/wbs/README.md`。

## いまどこまで終わったか

MVP（T000–T430）は完了している。`bun run check` は成功（62 tests + typecheck + build）。

| 区間 | 状態 |
| --- | --- |
| T000–T140 | DONE。C++ Core と sampleRate 非依存 |
| T150–T340 | DONE。決定性、WASM、Public API |
| T350–T410 | DONE。volume/dispose、vanilla / Phaser 4 例 |
| T420 | DONE。導入 README |
| T430 | DONE。§21 受け入れ。レビュー済み |

§21 の自動検証は `tests/acceptance.test.ts`。Web Audio / Phaser の実聴は T410 レビューと T430 手動記録による。

## これから

MVP の実装タスクは残っていない。次があるとすれば別 WBS を切る作業である。

- `dispose()` が共有 `AudioContext` を `close()` する点は、Phaser と BGM を同居させるときに注意。必要なら `closeContext: false`
- Phase 5（WAV export、CLI、作者向け GUI）は `docs/plan/wbs/PHASE5-deferred.md`
- Bfxr UI / ファイル互換 / AudioWorklet は非目標のまま

## 守る境界

- C++ に Web Audio / Phaser を入れない
- `src/` から Phaser を import しない
- 44100 を時間計算の定数にしない
- `npm` / `yarn` / `pnpm` 手順を追加しない
- Emscripten は 6.0.8
- Public API に `HEAPF32` / `_malloc` を出さない
