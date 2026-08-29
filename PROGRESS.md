# 進捗

最終更新: 2026-08-30

方針の正は `docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`。  
タスク分割の正は `docs/plan/wbs/README.md`。実装は Composer 2.5 が **1 タスクずつ** 行う。

## いまどこまで終わったか

C++ Synth Core は実 PCM を出すところまで来ている。sampleRate 非依存（44100 / 48000 / 22050 で長さと 440Hz ピッチが破綻しないこと）はテストで固定し、レビュー済み。

| 区間 | 状態 | 内容 |
| --- | --- | --- |
| T000 | DONE | Bun + Vite + Emscripten 6.0.8。`bun run check` が通る |
| T010–T030 | DONE | ライセンス、`validatePatch`、packed ABI 20 float |
| T040 | DONE | xorshift32。同一 seed は同一系列。`std::rand()` なし |
| T050–T120 | DONE | oscillator / envelope / slide / vibrato / duty / repeat / filter / phaser。部品レビュー済み |
| T130 | DONE | `render()` が実 DSP。Noise は位相 wrap 時だけ更新 |
| T140 | DONE | 長さ差 < 2ms、440Hz ± 2%。`core/src` に 44100 定数なし |
| T150 以降 | 未着手 | TypeScript 完成、preset、example、受け入れ |

確認済みコマンド（T140 レビュー時点）:

```bash
bun run test:core
bun run build:wasm
bun test tests
bun run typecheck
```

ルート `README.md` はまだ T000 時点の「無音レンダラ」記述が残っている。導入文の更新は T420。

## 次にやること

先頭タスクは **T150 Golden / 決定性**。

```text
T150 Golden / 決定性     ← 次
T200 WASM エラー処理
T300 WasmBridge 完成
T310 AudioBackend 完成
T320 Preset ローダ
T330 Cache
T340 SfxEngine Public API   ← 次の必須レビュー
T350 volume / pan / dispose
T400 vanilla example
T410 Phaser 4 example
T420 README（導入手順）
T430 受け入れ検証           ← 最終レビュー
```

渡し方: `docs/plan/wbs/COMPOSER_PROMPT.md` と、対象の `docs/plan/wbs/Txxx-*.md` を **1 ファイルだけ** 渡す。

## 残作業の展望

### 1. 決定性と WASM 境界（T150–T200）

同一 `Patch + Seed + SampleRate` を C++ と TS の両方で固定する。続けて不正 `sampleRate` / packed 長でクラッシュしないことを固める。ここは DSP を増やさない。

### 2. TypeScript 層の完成（T300–T350）

スケルトンの `SfxEngine` / `WasmBridge` / `AudioBackend` を、ゲーム向け API まで育てる。

- WASM の `HEAPF32` / `_malloc` を Public API に出さない
- AudioBackend は PCM を鳴らすだけ（Patch を解釈しない）
- preset 12 個前後を JSON で追加・上書き可能にする
- `preset + seed + sampleRate` で PCM キャッシュ
- `play` / `render` / `preload` / `clearCache` / `setMasterVolume` / `dispose`

T340 で API を確定してから example に進む。T200–T330 は WBS の Verify が通ればレビューなしで次へ進めてよい。

### 3. 統合と受け入れ（T400–T430）

- vanilla: Select / Jump / Hit / Explosion / Random variant
- Phaser 4 例（`phaser@4.2.1` は devDependency のみ。`src/` から import しない）
- README を別ゲームへコピーできる最小手順にする
- 親計画 §21 の受け入れ条件を T430 で実証する

### 4. やらないこと（いま）

Phase 5（WAV export、CLI `sfx render|mutate|random`、作者向け GUI）は `docs/plan/wbs/PHASE5-deferred.md`。Public API と sampleRate 非依存が固まってから別 WBS を切る。

Bfxr UI / ファイル互換 / 全パラメータ互換 / AudioWorklet は MVP 非目標のまま。

## レビュー地点

| 完了後 | 見る理由 |
| --- | --- |
| T140 | 済。Core の長さとピッチ |
| T340 | Public API を example より前に確定する |
| T410 | 任意。Phaser がライブラリに漏れないこと |
| T430 | 受け入れ条件の最終確認 |

T150–T330、T350、T400、T420 は戻らなくてよい。

## 守る境界

- C++ に Web Audio / Phaser を入れない
- 44100 を時間計算の定数にしない
- `npm` / `yarn` / `pnpm` 手順を追加しない
- Emscripten は 6.0.8（`tooling/emsdk-version.txt`）
