# reusable-procedural-sfx-wasm 実装計画

Composer 2.5 が実行するタスク分割は [`wbs/README.md`](wbs/README.md) を正とする。本ファイルは方針・範囲・受け入れ条件の正である。

## 0. 技術スタック

- Core Language: C++
- WASM Toolchain: Emscripten
- Wrapper / Public API: TypeScript
- Runtime / Package Manager: Bun
- Bundler / Dev Server: Vite
- Audio Output: Web Audio API
- Target: Modern Web Browser
- Module System: ES Modules

基本コマンド例:

```bash
bun install
bun run build:wasm
bun run dev
bun test
bun run typecheck
bun run build
```

`npm` / `yarn` / `pnpm` を前提とした手順は作らない。

---

## 1. 目的

Bfxr / sfxr 系のゲーム効果音生成アルゴリズムを参考にし、各ゲームから簡単に再利用できる Procedural SFX エンジンを WASM 化して提供する。

想定リポジトリ名:

```text
reusable-procedural-sfx-wasm
```

ゲーム側ではWASMの存在を極力意識しないAPIを目標とする。

```ts
const sfx = await createSfxEngine();
await sfx.play("ui.select");
await sfx.play("enemy.hit", { seed: enemy.id });
```

---

## 2. 参照実装と位置付け

### increpare/bfxr2
- JavaScript版Bfxr
- 現行Web実装の挙動・パラメータ体系確認用
- MIT License

### increpare/bfxr
- 元のActionScript版Bfxr
- `SfxrSynth.as` を生成アルゴリズムの参照元とする
- Apache License 2.0

### FigBug/bfxr
- C++移植版
- Emscripten/WASM化の実装参考として優先度が高い
- BSD-3-Clause License
- 44100 Hz前提の時間計算が残るため、そのまま移植しない

### jsfxr
- sfxr系の簡潔なJavaScript移植
- 最小DSP構造の理解用
- Apache License 2.0

---

## 3. 実装方針

MVP最短経路として **C++ + Emscripten** を採用する。

ただし、既存C++移植を丸ごとラップするのではなく、Bfxr系の挙動を参照して独立したC++ Synth Coreとして整理する。

理由:

- 44100 Hz固定前提を除去する
- Public APIを安定化する
- Bfxr UI固有コードを持ち込まない
- DSP拡張を容易にする
- ライセンス由来コード範囲を明確にする

直接コードを流用する場合は、元ライセンスと著作権表示を保持する。

---

## 4. ライセンス方針

参照元には複数ライセンスが存在する。

- Bfxr2: MIT
- Bfxr: Apache-2.0
- FigBug/bfxr: BSD-3-Clause
- jsfxr: Apache-2.0

可能な限り「挙動・数式・設計の参照」に留めて独立実装とする。

直接コードを取り込む場合は:

- `THIRD_PARTY_NOTICES.md` を用意する
- 元ライセンス文を保存する
- 著作権表示を保持する
- 派生ファイルを明示する

---

## 5. 基本アーキテクチャ

```text
game
  ↓
TypeScript API
  ↓
SfxEngine
  ↓
WASM Bridge
  ↓
C++ Synth Core
  ↓
Float32 PCM
  ↓
AudioBuffer
  ↓
Web Audio API
```

WASM側は音を直接再生しない。

WASM側:

```text
Patch → PCM生成
```

TypeScript側:

- AudioContext
- AudioBuffer生成
- 再生
- Volume
- Pan
- Cache
- Voice管理
- Preset管理

---

## 6. 推奨ディレクトリ構成

```text
reusable-procedural-sfx-wasm/
├─ core/
│  ├─ include/
│  │  ├─ sfx_patch.hpp
│  │  ├─ sfx_synth.hpp
│  │  └─ sfx_rng.hpp
│  └─ src/
│     ├─ sfx_synth.cpp
│     ├─ oscillators.cpp
│     ├─ envelope.cpp
│     ├─ filters.cpp
│     └─ rng.cpp
├─ wasm/
│  ├─ bindings.cpp
│  └─ build.sh
├─ src/
│  ├─ SfxEngine.ts
│  ├─ WasmBridge.ts
│  ├─ AudioBackend.ts
│  ├─ presets.ts
│  ├─ patch.ts
│  ├─ types.ts
│  └─ index.ts
├─ presets/
├─ examples/
│  ├─ vanilla/
│  └─ phaser4/
├─ THIRD_PARTY_NOTICES.md
├─ package.json
└─ README.md
```

---

## 7. Patch中間フォーマット

Bfxr内部パラメータをそのままPublic APIにしない。

`SfxPatchV1` を本リポジトリ独自の安定フォーマットとして定義する。

```ts
export interface SfxPatchV1 {
  version: 1;
  waveform: "square" | "saw" | "sine" | "triangle" | "noise";
  baseFrequency: number;
  frequencySlide: number;
  frequencyDeltaSlide: number;
  attack: number;
  sustain: number;
  decay: number;
  vibratoDepth: number;
  vibratoSpeed: number;
  duty?: number;
  dutySweep?: number;
  repeatSpeed?: number;
  lowPassCutoff?: number;
  lowPassSweep?: number;
  highPassCutoff?: number;
  highPassSweep?: number;
  phaserOffset?: number;
  phaserSweep?: number;
  masterVolume?: number;
}
```

将来は生成バックエンド差し替えを可能にする。

---

## 8. Sample Rate 方針

`FigBug/bfxr` の44100 Hz前提は継承しない。

SynthへsampleRateを必ず明示的に渡す。

```cpp
std::vector<float> render(
    const SfxPatch& patch,
    int sampleRate,
    uint32_t seed
);
```

対応候補:

- 22050
- 32000
- 44100
- 48000

Web Audio APIの `AudioContext.sampleRate` に合わせて生成可能にする。

受け入れ条件:

- 44100 Hzと48000 Hzで音長・エンベロープ時間が大きく変わらない
- pitchがsample rate依存で狂わない
- 時間値を固定sample countとして扱わない

---

## 9. Seeded Random

乱数は必ずseed指定可能にする。

```ts
await sfx.render("enemy.hit", { seed: 12345 });
```

同一 `Patch + Seed + SampleRate` からは同一PCMが生成されること。

用途:

- 敵種ごとの微差
- procedural variation
- 再現可能テスト
- deterministic build
- ランダムアセット生成

C++側では `std::rand()` を使用せず、明示的PRNGを持つ。

---

## 10. WASM API

WASM境界は小さく保つ。

```text
create_context()
destroy_context()
render_patch(patch, sample_rate, seed) -> PCM
```

TypeScript側ではEmscripten内部構造を隠す。

---

## 11. TypeScript Public API

```ts
const sfx = await createSfxEngine();

await sfx.play("ui.select");
await sfx.play("enemy.hit", {
  seed: 1234,
  volume: 0.8,
  pan: -0.2,
});

const pcm = await sfx.render(patch);
```

必要API:

- `createSfxEngine()`
- `play()`
- `render()`
- `preload()`
- `clearCache()`
- `setMasterVolume()`
- `dispose()`

---

## 12. Preset

MVPでは10〜20個程度を用意する。

```text
ui.select
ui.cancel
ui.confirm
item.pickup
item.coin
player.jump
player.damage
enemy.hit
weapon.shot
explosion.basic
powerup
warning
```

PresetはJSONまたはTypeScript objectで管理し、ゲーム側から上書き可能にする。

---

## 13. Cache

```text
preset + seed + sampleRate
        ↓
cache key
        ↓
AudioBuffer
```

頻出SEは初回または `preload()` で生成する。

```ts
await sfx.preload([
  "ui.select",
  "player.jump",
  "enemy.hit"
]);
```

---

## 14. Web Audio統合

```text
Float32Array
   ↓
AudioBuffer
   ↓
AudioBufferSourceNode
   ↓
GainNode
   ↓
StereoPannerNode
   ↓
destination
```

Phaser固有APIへ直接依存しない。

利用対象:

- Phaser 4
- Vanilla WebAudio
- PixiJS
- Three.js
- Electron
- Tauri

---

## 15. Phaser 4サンプル

`examples/phaser4` を必須とする。

最低限:

1. UI Select
2. Jump
3. Hit
4. Explosion
5. Random Variant

をキーまたはボタンで再生できるようにする。

ライブラリ本体はPhaserに依存しない。

---

## 16. CLI / Asset Generation

Phase 2以降で同じコアをCLIから利用可能にする。

```bash
bun run sfx render presets/ui.select.json output/ui-select.wav
bun run sfx mutate presets/enemy.hit.json --count 20
bun run sfx random --count 100
```

本リポジトリを:

1. Runtime procedural SFX engine
2. Offline WAV asset generator

の両方として利用可能にする。

---

## 17. libxmp-lite.wasmとの併用

本リポジトリと `libxmp-lite.wasm` は統合しない。

```text
libxmp-lite.wasm
    XM/MOD → PCM / BGM

procedural-sfx.wasm
    Patch → PCM / SFX
```

上位TypeScript層で共通管理できる設計にする。

将来候補:

```text
reusable-game-audio-web
├─ BGM: reusable-libxmp-lite-wasm
└─ SFX: reusable-procedural-sfx-wasm
```

---

## 18. MVPスコープ

- C++ Synth Core
- Emscripten WASM build
- TypeScript wrapper
- SfxPatchV1
- Square
- Saw
- Sine
- Triangle
- Noise
- ADSR相当 envelope
- frequency slide
- duty / duty sweep
- vibrato
- basic filters
- seeded random
- sampleRate非依存化
- Float32 PCM output
- Web Audio再生
- preset 10〜20個
- cache
- Phaser 4 example
- Bun + Vite build

---

## 19. 非目標

MVPでは以下を実装しない。

- Bfxr UI完全再現
- Bfxrファイル形式完全互換
- Bfxr全機能完全互換
- DAW plugin
- AudioWorkletリアルタイムDSP
- Streaming synthesis
- XM/MOD再生
- Phaser専用API
- FM音源
- GB/APU完全エミュレーション
- MIDI

---

## 20. テスト方針

### C++ Unit Test

- oscillator
- envelope
- filter
- seeded RNG
- sample rate behavior
- deterministic output

### TypeScript Unit Test

- Patch validation
- preset load
- cache key
- WASM bridge
- dispose
- preload

### Golden Test

同一 `Patch + Seed + SampleRate` に対してPCM hashが一定になることを確認する。

### Runtime Test

- Chromium系ブラウザ
- 44100 Hz
- 48000 Hz
- 複数SE同時再生
- 100回連続再生
- preload後の再生
- dispose後の安全性

---

## 21. 受け入れ条件

- `bun run build:wasm` 成功
- `bun run build` 成功
- WASMからFloat32 PCM取得可能
- Web Audio APIで生成音を再生可能
- Phaser 4 exampleで複数SEが鳴る
- 同一Patch + Seedで同一結果
- 44100 Hz / 48000 Hzで時間・pitchが破綻しない
- presetを外部JSONから追加可能
- game側がC++/Emscripten詳細を知らずに利用可能
- AudioBuffer cacheが機能する
- dispose時にリソース解放
- READMEの最小サンプルで別ゲームへ導入可能

---

## 22. 実装フェーズ

### Phase 0 — Reference Analysis

- Bfxr2のパラメータ体系確認
- Bfxr `SfxrSynth.as` のアルゴリズム確認
- FigBug/bfxr C++実装確認
- jsfxrの最小構造確認
- ライセンス整理
- `THIRD_PARTY_NOTICES.md` 作成
- SfxPatchV1決定

### Phase 1 — C++ Core

- PRNG
- oscillator
- envelope
- frequency slide
- vibrato
- duty
- filters
- PCM render
- sampleRate非依存化
- deterministic test

### Phase 2 — WASM

- Emscripten build
- binding
- memory transfer
- Float32Array受け渡し
- error handling

### Phase 3 — TypeScript Wrapper

- WasmBridge
- SfxEngine
- AudioBackend
- preset loader
- cache
- play / render / preload / dispose

### Phase 4 — Integration

- Bun + Vite
- vanilla example
- Phaser 4 example
- README
- build verification

### Phase 5 — Optional Tooling

- WAV export
- CLI
- random
- mutate
- preset authoring tools

---

## 23. Codex 5.6 Sol Medium にWBSを作らせる際の指示

- 1タスクはCompose 2.5が独立して実装・検証できる粒度にする
- 1タスク1責務を基本とする
- C++ Core / WASM / TypeScript / Audio Backendを混在させすぎない
- 各タスクに変更対象ファイル候補を書く
- 各タスクにAcceptance Criteriaを書く
- 依存タスクを明記する
- test / typecheck / build方法を書く
- sampleRate非依存化を独立した重要タスクとして扱う
- seeded RNGを早期に実装する
- Public API確定前にUI/CLI機能へ進まない
- Bfxr完全互換を目標にしない
- Bun + Vite + Emscriptenを前提とする
- npm/yarn/pnpm固有手順を追加しない

---

## 24. Compose 2.5 に実装させる際の原則

WBSを1タスクずつ渡す。

各タスクで:

1. Goal確認
2. 既存コード確認
3. 最小変更で実装
4. Test
5. Typecheck
6. Build
7. Acceptance Criteria自己確認
8. 完了内容を短く報告

特に:

- Synth CoreにWeb Audio依存を入れない
- WASM Bridgeにゲーム固有ロジックを入れない
- AudioBackendにBfxrパラメータ解釈を入れない
- TypeScript Public APIにEmscripten内部構造を露出しない

---

## 25. 最終方針

このリポジトリは「BfxrのWeb移植」そのものではなく、以下の構造を採る。

```text
Bfxr / sfxr family
      ↓
behavior / DSP reference
      ↓
independent C++ synth core
      ↓
Emscripten
      ↓
WASM
      ↓
TypeScript API
      ↓
Web Audio
```

MVP最短経路として C++ + Emscripten を採用し、既存の `libxmp-lite.wasm` ともビルド思想を揃える。

一方で、既存C++移植の44100 Hz固定前提やAPI設計をそのまま継承せず、sampleRate非依存・seeded random・安定したPatch形式・小さなWASM境界を本実装の中心要件とする。
