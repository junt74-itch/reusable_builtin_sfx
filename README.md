# reusable-procedural-sfx-wasm

Bfxr / sfxr 系を参照した、ゲーム向け Procedural SFX エンジンです。C++ Synth Core を Emscripten で WASM 化し、TypeScript から Web Audio API で再生します。

ゲーム側は WASM の詳細を知らなくてよい API を目標にしています。

```ts
const sfx = await createSfxEngine();
await sfx.play("ui.select");
await sfx.play("enemy.hit", { seed: enemy.id });
```

現状のコアはビルド検証用の無音レンダラです。DSP 本体は `docs/plan/wbs/` のタスクを Composer 2.5 で順に実装します。

## 必要環境

- Bun 1.3+
- Emscripten SDK **6.0.8**（`tooling/emsdk-version.txt`）
- ネイティブ C++ テスト用に `g++` または `clang++`（Windows では MSYS2 `g++` を想定）

`npm` / `yarn` / `pnpm` は使いません。

## セットアップ

```bash
bun install
bun run setup:emsdk
```

このマシンでは Emscripten を `C:\source\emsdk` に入れ、6.0.8 を activate 済みです。別環境では `EMSDK` を設定するか、上記コマンドで同じ版を入れてください。

## コマンド

```bash
bun run build:wasm
bun run dev
bun run test
bun run typecheck
bun run build
bun run check
```

`bun test` は TypeScript テストランナーです。C++ テストまで含むフル検証は `bun run test` または `bun run check` を使います。

- `build:wasm` … C++ を SINGLE_FILE の `generated/sfx_synth.mjs` にビルド（`core/src/*.cpp` を自動収集）
- `dev` … vanilla スモーク例（`http://localhost:5173`）
- `test` … native C++ テスト + TypeScript テスト
- `check` … test + typecheck + build

## ドキュメント

- 進捗: `PROGRESS.md`
- 方針: `docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`
- Composer 2.5 向け WBS: `docs/plan/wbs/README.md`
- 単位系とアルゴリズム契約: `docs/reference/sfx-units-and-algorithm.md`
