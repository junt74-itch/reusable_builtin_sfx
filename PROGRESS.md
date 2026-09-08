# 進捗

最終更新: 2026-09-07（wavetable32 TW080 完了）

方針の正は `docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`。  
wavetable32 方針の正は `docs/plan/wavetable32_IMPLEMENTATION_PLAN.md`。  
設計決定の正は `docs/plan/wbs/TW000-design-abi.md`。  
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

## wavetable32

| タスク | 状態 |
| --- | --- |
| TW000 Design / ABI | DONE。21-float、version 1 維持、専用 `wavetable32_sample`、context 所有 bank |
| TW010 primitive | DONE。decode / index / sample。`test:core` 成功 |
| TW020 WavetableBank | DONE。register / lookup / cap 256。`test:core` 成功 |
| TW030 oscillator integration | DONE。enum 5 + `render(..., bank*)`。pack はまだ 20 |
| TW040 Patch / ABI | DONE。21-float + 20 互換。version 1 |
| TW050 WASM bindings | DONE。context 所有 bank + WasmBridge 低レベル API |
| TW060 TS high-level API | DONE。named register + cache 無効化。失敗 register の名前漏れ修正済み |
| TW070 sample wavetables | DONE。3 波形 + 3 preset + createSfxEngine 自動登録 |
| TW071 example UI | DONE。vanilla に 440Hz 比較。ブラウザでクリック確認済み |
| TW072 README / reference | DONE。register→play と 21-float ABI を文書化 |
| TW080 regression | DONE。`bun run check` 成功（119 tests） |

## これから

wavetable32 を TW080 まで進める。既存 T000–T540 は再開しない。

- `bun run sfx random`（全ランダム生成）は別作業のまま
- `bun run sfx render`（CLI からの WAV。関数は T530 済み）
- `mutatePatch` は seed `0` を内部 `1` にする。CLI のデフォルト seed 連番 `0..count-1` では先頭 2 件が同一になる
- `dispose()` が共有 `AudioContext` を `close()` する点は、Phaser と BGM を同居させるときに注意。必要なら `closeContext: false`
- Bfxr UI / ファイル互換 / AudioWorklet / 可変長 wavetable / 補間は非目標のまま

## 守る境界

- C++ に Web Audio / Phaser を入れない
- `src/` から Phaser を import しない
- 44100 を時間計算の定数にしない
- `npm` / `yarn` / `pnpm` 手順を追加しない
- Emscripten は 6.0.8
- Public API に `HEAPF32` / `_malloc` を出さない
