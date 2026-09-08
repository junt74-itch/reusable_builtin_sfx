# reusable-procedural-sfx-wasm

ゲーム向けの **再利用可能な procedural SFX ライブラリ** です。C++ Synth Core を Emscripten で WASM 化し、TypeScript から Web Audio API で再生します。

**Bfxr / sfxr 系の UI やファイル形式の移植ではありません。** 参照したのはアルゴリズムの考え方だけで、ゲーム側は preset 名と patch オブジェクトだけを扱い、WASM や Emscripten の詳細は見えません。

## 最小導入（ゲーム側）

```ts
import { createSfxEngine } from "reusable-procedural-sfx-wasm";

const sfx = await createSfxEngine();

await sfx.play("ui.select");
await sfx.play("player.jump");
await sfx.play("enemy.hit", { seed: enemyId, volume: 0.8, pan: -0.2 });

// 終了時
sfx.dispose();
```

### wavetable32（32 サンプル波形）

波形データは **Patch とは別メモリ** に登録します。1 周期 32 サンプル、`Uint8Array` で各値 0..255、nearest-neighbor で読み出します。

```ts
const wave = new Uint8Array(32); // 例: 自作波形
// wave[i] = ... (0..255)

sfx.registerWavetable("bell", wave); // Uint8Array 32, 値 0..255
await sfx.play({
  waveform: "wavetable32",
  wavetable: "bell",
  baseFrequency: 440,
  attack: 0,
  sustain: 0.08,
  decay: 0.15,
});
```

`createSfxEngine` は builtin 波形 `sineish` / `metallic` / `hollow` を自動登録し、対応 preset `wavetable.sineish` 等（計 3 種）も含めます。Patch 側は `wavetable: "sineish"` のように名前参照するか、数値 `wavetableId` を指定します。

Phaser 4 など既存の `AudioContext` を共有する場合:

```ts
const sfx = await createSfxEngine({ audioContext: game.sound.context });
await sfx.play("explosion.basic");
```

主な API: `createSfxEngine`, `play`, `render`, `preload`, `clearCache`, `registerWavetable`, `unregisterWavetable`, `clearWavetables`, `setMasterVolume`, `dispose`, `mutatePatch`。builtin preset はゲーム向け 12 種（`ui.select`, `player.jump`, `enemy.hit`, `explosion.basic` など）に加え、wavetable 試聴用 demo preset 3 種（`wavetable.sineish` 等、`BUILTIN_PRESET_NAMES` 参照）。

## パッケージ利用時の要件

- Web Audio API を利用できるブラウザ環境

WASM は公開パッケージの `dist/` に同梱されます。ゲーム側は通常どおり `npm` / `yarn` / `pnpm` / `bun` でパッケージを導入するだけでよく、Emscripten や `bun run build:wasm` は不要です。

```bash
npm install reusable-procedural-sfx-wasm
```

## フレームワーク開発時の要件

- **Bun** 1.3+
- ネイティブ C++ テスト用に `g++` または `clang++`（任意）

`generated/sfx_synth.mjs` はリポジトリで追跡する生成済み WASM モジュールです。そのため、新規 clone 後でも通常の開発・テスト・`dist/` ビルドで Emscripten は不要です。

WASM を更新するフレームワーク保守者だけは **Emscripten SDK 6.0.8**（`tooling/emsdk-version.txt`）を用意して `bun run build:wasm` を実行します。公開時の `prepack` もこの再生成を行ったうえで、WASM を埋め込んだ `dist/index.js` と `dist/sfx_synth-*.js` を npm tarball に含めます。

## セットアップと確認

```bash
bun install
bun run dev            # vanilla 例 → http://localhost:5173/
bun run dev:authoring  # 作者向けガチャ → http://localhost:5175/
bun run check          # test + typecheck + build
```

WASM を変更・再生成するときだけ、Emscripten は `EMSDK` 環境変数を設定するか、`bun run setup:emsdk` で 6.0.8 を入れてください。

## 例

### Vanilla（Phaser 非依存）

```bash
bun run dev
```

`http://localhost:5173/` で 5 ボタン（ui.select / player.jump / enemy.hit / explosion.basic / Random variant）から SE を試せます。下段の **440 Hz comparison** では Sine / Triangle と wavetable32 3 種（Sine-ish / Metallic / Hollow）を同一ピッチで比較できます。

### Phaser 4

```bash
bun run dev:phaser
```

`http://localhost:5174/` でキー（`1`–`5` または `U/J/H/E/R`）または画面上のボタンから同様の 5 アクションを試せます。`phaser@4.2.1` は **devDependency のみ** で、ライブラリ本体（`src/`）は Phaser に依存しません。詳細は [`examples/phaser4/README.md`](examples/phaser4/README.md)。

### 作者向けガチャ（カテゴリ mutate）

```bash
bun run dev:authoring
```

`http://localhost:5175/` で builtin preset（ゲーム向け 12 種 + wavetable demo 3 種）をカテゴリに選び、Space または「引く」でガチャ再生します。`KAMATA wave32` から 25 種の波形メモリを選ぶと、カテゴリを問わずその 32 サンプル波形で試せます。続けてスライダーで Hz / 秒のまま調整し、画面上の `await sfx.play({ ... })` をコピーしてゲームに貼れます。

公開版は GitHub Pages です。

```text
https://junt74-itch.github.io/reusable_builtin_sfx/
```

`main` への push で [Pages workflow](.github/workflows/pages.yml) が `bun run build:authoring` して更新します。初回だけリポジトリの Settings → Pages → Source を **GitHub Actions** にしてください。ローカル確認は `bun run build:authoring` のあと `bun run preview:authoring` です。

### CLI mutate（preset から変種 JSON）

```bash
bun run sfx mutate presets/enemy.hit.json --count 20
bun run sfx mutate presets/ui.select.json --count 3 --out tmp/ui-select
```

入力 JSON を `validatePatch` し、`mutatePatch` で決定的な変種を stdout（JSON 配列）または `--out` 配下の `name-0001.json` として出力します。`--amount` 省略時は 0.45（Medium）、seed は `0..count-1`（`--seed` 指定時はその値から連番）です。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `bun run build:wasm` | 保守者用: C++ → 追跡対象の `generated/sfx_synth.mjs` を更新 |
| `bun run dev` | vanilla 例（port 5173） |
| `bun run dev:phaser` | Phaser 4 例（port 5174） |
| `bun run dev:authoring` | 作者向けガチャ（port 5175） |
| `bun run build:authoring` | 作者向けガチャを GitHub Pages 用にビルド |
| `bun run preview:authoring` | ビルド済み作者向けガチャを確認 |
| `bun run sfx mutate <preset.json> --count N` | preset から変種 JSON を生成 |
| `bun run test` | C++ テスト + TypeScript テスト |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run build` | 生成済み WASM を使いライブラリ `dist/` をビルド |
| `npm pack` | `prepack` で WASM を再生成し、同梱済み npm tarball を生成 |
| `bun run check` | test + typecheck + build |

## 非目標

- Bfxr UI の完全再現
- Bfxr / `.sfxr` 等のファイル互換
- AudioWorklet による低遅延再生
- `bun run sfx random`（全ランダム生成 CLI）
- `bun run sfx render`（WAV 書き出し CLI）
- 任意長 wavetable、16-bit サンプル、波形エディタ、補間（linear 等）、morphing

## ライセンス

参照元のライセンスは [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) を参照してください。

## 開発者向け

- 進捗: [`PROGRESS.md`](PROGRESS.md)
- 実装計画: [`docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md`](docs/plan/reusable-procedural-sfx-wasm_IMPLEMENTATION_PLAN.md)
- Composer 向け WBS: [`docs/plan/wbs/README.md`](docs/plan/wbs/README.md)
- 単位系: [`docs/reference/sfx-units-and-algorithm.md`](docs/reference/sfx-units-and-algorithm.md)
