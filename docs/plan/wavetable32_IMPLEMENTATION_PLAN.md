# 32-sample / 8-bit wavetable oscillator 実装計画

## 1. 目的

`reusable_builtin_sfx` に、**8-bit unsigned / 32-sample 固定長のメモリ波形を1周期として再生する wavetable oscillator** を追加する。

既存の Square / Saw / Sine / Triangle / Noise を壊さず、6番目の波形として導入する。

想定Public API:

```ts
const wave = new Uint8Array(32);

sfx.registerWavetable("bell", wave);

await sfx.play({
  waveform: "wavetable32",
  wavetable: "bell",
  baseFrequency: 440,
});
```

本機能は、Bfxr/sfxr系のprocedural SFXに、GB系Wave RAMや初期デジタル音源に近い小容量メモリ波形を組み合わせるための拡張と位置付ける。

---

## 2. 作業体制

Cursor IDE内では以下の役割分担で進める。

### Grok 4.6 — 進捗管理・設計管理役

担当:

- 本計画書を基にWBSを作成する
- タスク依存関係を管理する
- 各タスクのAcceptance Criteriaを確定する
- Composer 2.5へ1タスクずつ実装指示を出す
- 実装後のdiff / test / typecheck / build結果をレビューする
- 仕様逸脱、先行実装、責務混在を検出する
- 完了したタスクの状態をWBSへ反映する
- 次タスクへ進めるか判断する

Grok 4.6自身は、原則として大規模な実装コードを書かない。

### Composer 2.5 — 実装サブエージェント

担当:

- Grok 4.6から渡された単一WBSタスクを実装する
- 対象コードと関連テストを読む
- 最小差分で実装する
- 必要なunit test / integration testを追加する
- `bun test`
- `bun run typecheck`
- `bun run build`
  を実行する
- Acceptance Criteriaに対する自己確認結果を報告する

Composer 2.5は次タスクの機能を先回りして実装しない。

---

## 3. 現状整理

現在のC++コアでは `SfxWaveform` が以下の5種類。

```text
Square   = 0
Saw      = 1
Sine     = 2
Triangle = 3
Noise    = 4
```

追加予定:

```text
Wavetable32 = 5
```

現在の `SfxPatch` はC++ / TypeScript間で共有する固定ABIであり、20個のfloatへpack/unpackされる。

したがって、**32byteのwavetable本体を既存Patch ABIへ直接追加しない**。

---

## 4. 設計方針

### 4.1 Patchと波形メモリを分離する

推奨構造:

```text
SfxPatch
  waveform = Wavetable32
  wavetableId = N

WavetableBank
  ID 0 -> Uint8[32]
  ID 1 -> Uint8[32]
  ID 2 -> Uint8[32]
  ...
```

既存Patch ABIを可能な限り維持し、波形データは別APIでWASMへ登録する。

### 4.2 外部形式

wavetableの外部表現は以下に固定する。

```text
型: Uint8Array
長さ: 32 samples
値域: 0..255
```

C++内部では読み出し時に `-1.0 .. +1.0` へ正規化する。

```cpp
float value = static_cast<float>(sample) / 127.5f - 1.0f;
```

### 4.3 位相

既存oscillatorと同様、phaseを `0.0 <= phase < 1.0` とする。

nearest-neighbor読み出し:

```cpp
const int index = static_cast<int>(wrap_phase(phase) * 32.0f) & 31;
```

MVPでは補間しない。

32サンプルという粗い波形自体を音色特性として扱う。

### 4.4 補間

MVP:

```text
nearest only
```

将来候補:

```text
nearest
linear
```

Public APIへ補間方式を追加するのは、実利用で必要性が確認されてからとする。

---

## 5. C++コア設計

追加候補:

```text
core/include/sfx_wavetable.hpp
core/src/wavetable.cpp
```

型例:

```cpp
using Wavetable32 = std::array<std::uint8_t, 32>;
```

責務:

- 波形データ保持
- IDによるlookup
- 32sample読み出し
- uint8 -> float正規化
- 登録 / 上書き / 削除

oscillator側では、wavetableデータの所有責務を持たせない。

---

## 6. WavetableBank

C++側に軽量registryを用意する。

概念API:

```cpp
register_wavetable(id, samples32)
unregister_wavetable(id)
has_wavetable(id)
get_wavetable(id)
clear_wavetables()
```

要件:

- IDは整数
- 32byte以外を受け付けない
- 未登録ID参照時は安全に失敗する
- 合理的な最大登録数を設定するか、動的管理する
- Synth render中に所有権問題を起こさない

---

## 7. Patch ABI方針

ここはGrok 4.6がWBS化前に必ず設計判断する。

候補A: 既存20-float ABIを拡張する

```text
SFX_PACKED_FLOAT_COUNT = 21
out[20] = wavetableId
```

メリット:

- 実装が単純
- render_patch APIを維持しやすい

デメリット:

- ABI変更になる

候補B: waveformごとの追加parameter APIを持つ

メリット:

- 20-float ABI維持

デメリット:

- 状態管理が複雑
- Patch単体で完結しない

### 推奨

現時点では **候補A** を第一候補とする。

ただし、ABI versioning / TypeScript側互換性 /既存presetへの影響をGrok 4.6が確認し、WBS開始時に最終決定する。

既存Patchの `version` を利用し、必要ならPatch v2として明示する。

---

## 8. oscillator変更

既存:

```cpp
float oscillator_sample(
  SfxWaveform wave,
  float phase,
  float duty,
  SfxRng& rng
);
```

wavetable追加後は、そのまま引数を増やすと責務が膨らむ可能性がある。

候補:

```cpp
struct OscillatorContext {
  float duty;
  SfxRng* rng;
  const Wavetable32* wavetable;
};
```

あるいはSynth側でWavetable32の場合のみ専用関数を呼ぶ。

Grok 4.6は既存呼び出し箇所を確認し、**最小変更かつ将来波形追加に耐える方法**を選定する。

MVPで過剰な抽象化は行わない。

---

## 9. WASM境界

追加する概念API:

```text
register_wavetable(id, ptr, length)
unregister_wavetable(id)
clear_wavetables()
```

制約:

- lengthは必ず32
- JS側Uint8ArrayをWASM heapへ安全にコピーする
- 登録後はC++側が独立したコピーを保持する
- JS側buffer寿命に依存しない

render時:

```text
Patch.wavetableId
   ↓
WavetableBank lookup
   ↓
Wavetable32 oscillator
```

---

## 10. TypeScript API

低レベルAPI:

```ts
registerWavetable(id: number, data: Uint8Array): void;
unregisterWavetable(id: number): void;
clearWavetables(): void;
```

高レベルAPIでは文字列名を許可してよい。

```ts
sfx.registerWavetable("bell", data);
```

TypeScript側で名前→整数IDを管理する。

Patch表現例:

```ts
{
  waveform: "wavetable32",
  wavetable: "bell",
  baseFrequency: 440,
  attack: 0,
  sustain: 0.08,
  decay: 0.15
}
```

既存waveform Patchにはwavetable指定を要求しない。

---

## 11. Preset / JSON

JSONからも波形指定可能にする。

候補1: 数値配列を直接保持

```json
{
  "waveform": "wavetable32",
  "wavetableData": [0, 8, 16, 24]
}
```

実際には32要素必須。

候補2: named wavetable参照

```json
{
  "waveform": "wavetable32",
  "wavetable": "metallic01"
}
```

### 推奨

Presetはnamed referenceを基本とし、波形バンクを別ファイルで管理する。

例:

```text
wavetables/
├─ bell.json
├─ metallic.json
├─ hollow.json
└─ dirty.json
```

1ファイル = 32個の0..255整数。

---

## 12. テスト計画

### C++ unit test

必須:

- 32sample index mapping
- phase 0.0
- phase near 1.0
- wrap phase
- uint8 0 -> approximately -1.0
- uint8 128 -> approximately 0.0
- uint8 255 -> +1.0
- deterministic oscillator output
- unregistered wavetable ID
- register / unregister / clear

### ABI test

- existing five waveforms remain unchanged
- old preset serialization compatibility
- wavetableId round-trip
- invalid waveform handling

### TypeScript test

- `Uint8Array(32)` accepted
- length 31 / 33 rejected
- numeric array converted safely if supported
- named wavetable resolution
- duplicate registration behavior
- unregister
- clear

### Integration test

- WASM登録→render→Float32 PCM取得
- 440Hzで周期が期待範囲
- 44.1kHz / 48kHzでpitchが破綻しない
- cacheと併用可能
- existing SFX presetsが従来どおり鳴る

---

## 13. Example

既存example UIへwavetableデモを追加する。

最低3種類:

```text
Wavetable Sine-ish
Wavetable Metallic
Wavetable Hollow
```

比較用:

```text
Sine
Triangle
Wavetable32
```

を同一pitchで試聴できるようにする。

可能なら32sample値を簡易表示するが、MVPではエディタ機能までは作らない。

---

## 14. 実装フェーズ

### Phase W0 — Design / ABI

Grok 4.6担当:

- 現在のPatch ABI確認
- TypeScript mirror確認
- WASM binding確認
- ABI拡張方式決定
- WBS作成

完了条件:

- wavetableId伝達方式が確定
- 既存互換性方針が確定

### Phase W1 — C++ wavetable primitive

Composer 2.5担当:

- Wavetable32型
- sample conversion
- phase lookup
- unit tests

### Phase W2 — WavetableBank

- register
- lookup
- unregister
- clear
- validation
- tests

### Phase W3 — oscillator integration

- `SfxWaveform::Wavetable32`
- synth routing
- wavetable lookup
- missing-table behavior
- regression tests

### Phase W4 — Patch / ABI

- wavetableId
- pack/unpack
- versioning if needed
- TypeScript mirror
- ABI tests

### Phase W5 — WASM bindings

- register API
- unregister API
- clear API
- Uint8 transfer
- lifecycle tests

### Phase W6 — TypeScript high-level API

- named registry
- validation
- patch normalization
- play/render integration

### Phase W7 — Presets / Example / Docs

- sample wavetables
- demo presets
- example UI
- README usage
- reference docs

### Phase W8 — Regression / Release readiness

- full test
- typecheck
- build
- existing preset playback verification
- API documentation review

---

## 15. Grok 4.6向けWBS作成ルール

WBSは `docs/plan/wbs/` へ追加する。

タスクIDは既存WBSと衝突しない番号帯を使用する。

推奨:

```text
TW000-
```

または既存命名規則に合わせて空いている番号帯を選ぶ。

各WBSファイルは必ず以下を含む。

```markdown
# TASK-ID title

## Goal

## Dependencies

## Files

## Implementation

## Acceptance Criteria

## Verification

## Out of Scope
```

ルール:

- 1タスク1責務
- Composer 2.5が1回で完結できる粒度
- 変更対象ファイルを明記
- testを後回しにしない
- 既存5波形のregressionを常に考慮
- ABI変更タスクとDSP実装タスクを混ぜない
- WASM memory handlingとTS APIを同一巨大タスクにしない
- Example / docsはコア完了後

---

## 16. Grok 4.6の進捗管理手順

各タスクについて以下を繰り返す。

1. WBSから次のReadyタスクを1つ選ぶ
2. Composer 2.5へそのタスクだけ渡す
3. Composerの変更diffを確認する
4. Acceptance Criteriaを1項目ずつ確認する
5. `bun test` / `bun run typecheck` / `bun run build`結果を確認する
6. C++テストが別scriptならそれも確認する
7. 問題があれば同一タスクとしてComposerへ修正依頼する
8. 完了後のみWBSをDoneへ更新する
9. 次の依存タスクをReadyにする

Grok 4.6は、Composerの「完了しました」という自己申告だけでDoneにしない。

---

## 17. Composer 2.5への標準指示

各タスクへ以下を添える。

```text
このタスクだけを実装してください。
次タスクの内容を先回りしないでください。
既存Public API・既存5波形の挙動を壊さないでください。
変更前に関連コードとテストを読んでください。
実装後に指定されたテスト、typecheck、buildを実行してください。
Acceptance Criteriaごとに結果を報告してください。
```

---

## 18. 非目標

今回のwavetable32拡張では以下を実装しない。

- 任意長wavetable
- 16-bit wavetable
- stereo wavetable
- sample playback
- wavetable morphing
- wavetable scanning
- wavetable editor
- additive synthesis
- FFT生成
- anti-aliasing高度化
- mipmapped wavetable
- realtime AudioWorklet synth

これらは別拡張とする。

---

## 19. 完了条件

以下をすべて満たしたとき本機能を完了とする。

- `Wavetable32` が6番目の波形として利用可能
- 32個の0..255サンプルを登録可能
- named wavetableをTypeScriptから利用可能
- WASM越しに安全に波形登録できる
- wavetable Patchをrender/play可能
- 44.1kHz / 48kHzで正しいpitchを維持
- seeded procedural処理と共存
- cacheと共存
- existing 5 waveformsのregressionなし
- invalid lengthを拒否
- missing wavetableを安全に処理
- C++ tests成功
- `bun test` 成功
- `bun run typecheck` 成功
- `bun run build` 成功
- exampleでwavetable32を試聴可能
- README / reference documentation更新済み

---

## 20. 最終方針

今回の拡張では、既存Bfxr系シンセ構造を壊さず、**Patchと32byte波形メモリを分離する**。

```text
TypeScript
   │
   ├─ SfxPatch
   │    └─ wavetableId
   │
   └─ Wavetable Registry
         └─ Uint8Array(32)
              │
              ▼
             WASM
              │
              ▼
        C++ WavetableBank
              │
              ▼
      Wavetable32 oscillator
              │
              ▼
             PCM
```

Grok 4.6が設計・進捗・品質ゲートを管理し、Composer 2.5がWBS単位で実装する。

これにより、AIエージェントが長い実装を一度に抱えず、ABI・DSP・WASM・TypeScriptそれぞれの責務を分離したまま安全に開発を進める。
