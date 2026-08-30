# Composer 2.5 向け WBS

親方針: [`../reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`](../reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md)  
単位系の正: [`../../reference/sfx-units-and-algorithm.md`](../../reference/sfx-units-and-algorithm.md)

実装は **1 タスクずつ** 渡す。この README を全部一度に実装してはいけない。

## 使い方

1. 下の実行順で、未完了の先頭タスクを 1 つ選ぶ
2. [`COMPOSER_PROMPT.md`](COMPOSER_PROMPT.md) の手順と、そのタスクファイルだけを渡す
3. Acceptance Criteria と Verify が全部通ったら次へ
4. 失敗したら同じタスクを直す。先のタスクへ進まない

Cursor Composer 2.5 は、広いリファクタや「Bfxr を全部移植」は苦手です。各ファイルの **Out of scope** を守らせてください。

## 実行順

```text
T000 ビルド環境          DONE
T010 ライセンス表示      DONE
T020 Patch バリデーション DONE
T030 Patch ABI           DONE（T000 に含む）
T040 Seeded PRNG         DONE
T050 Oscillators         DONE
T060 Envelope            DONE
T070 Frequency slide     DONE
T080 Vibrato             DONE
T090 Duty / duty sweep   DONE
T100 Repeat              DONE
T110 Filters             DONE
T120 Phaser              DONE（T120 レビュー済み）
T130 Render 統合         DONE
T140 sampleRate 非依存   DONE（T140 レビュー済み）
T150 Golden / 決定性     DONE
T200 WASM エラー処理     DONE
T300 WasmBridge 完成     DONE
T310 AudioBackend 完成   DONE
T320 Preset ローダ       DONE
T330 Cache               DONE
T340 SfxEngine Public API DONE（T340 レビュー済み）
T350 volume / pan / dispose DONE
T400 vanilla example     DONE
T410 Phaser 4 example    DONE（T410 レビュー済み）
T420 README（導入手順）   DONE
T430 受け入れ検証        DONE（T430 レビュー済み）
T500 mutatePatch API     DONE
T510 作者向けガチャ GUI  DONE
T520 作者向けスライダ    DONE
T530 WAV export          DONE
T540 CLI mutate          DONE
```

依存の要点:

- T040 は T050 の noise より前
- T050〜T120 は **関数と単体テストだけ**。`render()` の無音スタブは T130 まで残す
- T140 は T130 のあと。44100 固定を独立して潰す
- T320 より前に Public API の型を壊さない
- T400 / T410 の前に T340 まで完了
- Phase 5 は T500 から。mutate → 作者 GUI → スライダ → WAV → CLI の順
- T500–T540 は DONE。`sfx random` / `sfx render` はまだ入れない

## いま通っているコマンド

```bash
bun install
bun run setup:emsdk          # 未導入マシンのみ。版は 6.0.8
bun run build:wasm
bun run test:core
bun run test
bun run typecheck
bun run build
bun run dev
bun run dev:authoring
bun run build:authoring
bun run preview:authoring
bun run sfx mutate presets/ui.select.json --count 3
bun run check
```

Emscripten は `C:\source\emsdk`（6.0.8）。検出順は `EMSDK` → `C:\source\emsdk` → `~/emsdk`。

## レイヤ境界（破ったら差し戻し）

- C++ Core に Web Audio / DOM / Phaser を入れない
- WASM Bridge にゲーム固有ロジック・preset 名・Bfxr スライダー変換を入れない
- AudioBackend に Patch 解釈を入れない（PCM を鳴らすだけ）
- Public API に Emscripten の `HEAPF32` / `_malloc` を出さない
- `std::rand()` 禁止
- 44100 を時間計算の定数にしない
- `npm` / `yarn` / `pnpm` 手順を追加しない

## スケルトンの現状

T000 で次が入っている。Composer はこれを壊さず足す。

- `core/include/sfx_patch.hpp` … packed ABI 20 float
- `core/src/sfx_synth.cpp` … **エンベロープ長の無音**（T130 で置換）
- `core/src/rng.cpp` … 常に 0.5 を返すプレースホルダ（T040 で置換）
- `wasm/bindings.cpp` … `create_context` / `destroy_context` / `render_patch`
- `src/SfxEngine.ts` ほか TypeScript の薄い実装
- `scripts/build-wasm.ts` は `core/src/*.cpp` を自動収集する（新規 .cpp をスクリプトに手書きしなくてよい）
