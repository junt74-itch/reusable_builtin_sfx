# 進捗

最終更新: 2026-08-30（T540 CLI mutate）

方針の正は `docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`。  
タスク分割の正は `docs/plan/wbs/README.md`。

## いまどこまで終わったか

MVP（T000–T430）と Phase 5（T500–T540）は完了している。

| 区間 | 状態 |
| --- | --- |
| T000–T140 | DONE。C++ Core と sampleRate 非依存 |
| T150–T340 | DONE。決定性、WASM、Public API |
| T350–T410 | DONE。volume/dispose、vanilla / Phaser 4 例 |
| T420 | DONE。導入 README |
| T430 | DONE。§21 受け入れ。レビュー済み |
| T500 | DONE。`mutatePatch` |
| T510 | DONE。作者向けガチャ + 履歴 + コピー |
| T520 | DONE。選択中 patch の単位付き編集 |
| T530 | DONE。`encodeWavPcm16` と GUI の Download WAV |
| T540 | DONE。`bun run sfx mutate` |

§21 の自動検証は `tests/acceptance.test.ts`。作者 GUI は `bun run dev:authoring`。CLI は `bun run sfx mutate presets/ui.select.json --count 3`。

## これから

WBS 上の実装タスクは残っていない。次があるとすれば別 WBS を切る作業である。

- `bun run sfx random`（全ランダム生成）
- `bun run sfx render`（CLI からの WAV。関数は T530 済み）
- `mutatePatch` は seed `0` を内部 `1` にする。CLI のデフォルト seed 連番 `0..count-1` では先頭 2 件が同一になる
- `dispose()` が共有 `AudioContext` を `close()` する点は、Phaser と BGM を同居させるときに注意。必要なら `closeContext: false`
- Bfxr UI / ファイル互換 / AudioWorklet は非目標のまま

## 守る境界

- C++ に Web Audio / Phaser を入れない
- `src/` から Phaser を import しない
- 44100 を時間計算の定数にしない
- `npm` / `yarn` / `pnpm` 手順を追加しない
- Emscripten は 6.0.8
- Public API に `HEAPF32` / `_malloc` を出さない
