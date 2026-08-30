# reusable-procedural-sfx-wasm

ゲーム向けの **再利用可能な procedural SFX ライブラリ** です。C++ Synth Core を Emscripten で WASM 化し、TypeScript から Web Audio API で再生します。

**Bfxr / sfxr 系の UI やファイル形式の移植ではありません。** 参照したのはアルゴリズムの考え方だけで、ゲーム側は preset 名と patch オブジェクトだけを扱い、WASM や Emscripten の詳細は見えません。

## 最小導入（ゲーム側）

```ts
import { createSfxEngine } from "./path/to/dist/index.js";

const sfx = await createSfxEngine();

await sfx.play("ui.select");
await sfx.play("player.jump");
await sfx.play("enemy.hit", { seed: enemyId, volume: 0.8, pan: -0.2 });

// 終了時
sfx.dispose();
```

Phaser 4 など既存の `AudioContext` を共有する場合:

```ts
const sfx = await createSfxEngine({ audioContext: game.sound.context });
await sfx.play("explosion.basic");
```

主な API: `createSfxEngine`, `play`, `render`, `preload`, `clearCache`, `setMasterVolume`, `dispose`。builtin preset 名は `ui.select`, `player.jump`, `enemy.hit`, `explosion.basic` など 12 種（`BUILTIN_PRESET_NAMES`）。

## 必要環境

- **Bun** 1.3+
- **Emscripten SDK 6.0.8**（`tooling/emsdk-version.txt`）
- ネイティブ C++ テスト用に `g++` または `clang++`（任意）

`npm` / `yarn` / `pnpm` は使いません。

## セットアップと確認

```bash
bun install
bun run setup:emsdk
bun run dev          # vanilla 例 → http://localhost:5173/
bun run check        # test + typecheck + build
```

Emscripten は `EMSDK` 環境変数を設定するか、`bun run setup:emsdk` で 6.0.8 を入れてください。

## 例

### Vanilla（Phaser 非依存）

```bash
bun run dev
```

`http://localhost:5173/` で 5 ボタン（ui.select / player.jump / enemy.hit / explosion.basic / Random variant）から SE を試せます。

### Phaser 4

```bash
bun run dev:phaser
```

`http://localhost:5174/` でキー（`1`–`5` または `U/J/H/E/R`）または画面上のボタンから同様の 5 アクションを試せます。`phaser@4.2.1` は **devDependency のみ** で、ライブラリ本体（`src/`）は Phaser に依存しません。詳細は [`examples/phaser4/README.md`](examples/phaser4/README.md)。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `bun run build:wasm` | C++ → `generated/sfx_synth.mjs` |
| `bun run dev` | vanilla 例（port 5173） |
| `bun run dev:phaser` | Phaser 4 例（port 5174） |
| `bun run test` | C++ テスト + TypeScript テスト |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run build` | ライブラリ `dist/` をビルド |
| `bun run check` | test + typecheck + build |

## 非目標

- Bfxr UI の完全再現
- Bfxr / `.sfxr` 等のファイル互換
- AudioWorklet による低遅延再生
- Phase 5 の CLI / 作者向け GUI（MVP 外）

## ライセンス

参照元のライセンスは [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) を参照してください。

## 開発者向け

- 進捗: [`PROGRESS.md`](PROGRESS.md)
- 実装計画: [`docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`](docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md)
- Composer 向け WBS: [`docs/plan/wbs/README.md`](docs/plan/wbs/README.md)
- 単位系: [`docs/reference/sfx-units-and-algorithm.md`](docs/reference/sfx-units-and-algorithm.md)
