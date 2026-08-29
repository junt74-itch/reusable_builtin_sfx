# Composer 2.5 への渡し方

新しいチャットまたは同じ Composer に、**1 タスク分だけ** を渡す。

## プロンプト（このまま使う）

```text
docs/plan/wbs/ のタスク Txxx を実装する。

守ること:
1. 指定タスクの Goal だけを実装する。先読みで次タスクを実装しない。
2. docs/reference/sfx-units-and-algorithm.md の単位系に従う。Bfxr 完全互換は禁止。
3. 既存の bun / Vite / Emscripten 6.0.8 フローを維持する。npm/yarn/pnpm は使わない。
4. C++ Core に Web Audio を入れない。Public API に Emscripten 内部を出さない。
5. 44100 を時間や周期の定数にしない。std::rand() を使わない。
6. scripts/build-wasm.ts は core/src/*.cpp を自動収集する。新規 cpp は core/src/ に置けばよい。

手順:
1. Goal を確認する
2. 既存コードを読む（変更対象ファイル）
3. 最小変更で実装する
4. タスク記載の Verify を実行する
5. Acceptance Criteria を自己確認する
6. 完了内容を短く報告する（変更ファイルとコマンド結果）
```

続けてタスクファイル（例: `docs/plan/wbs/T040-seeded-prng.md`）の全文を添付する。

## 完了報告の型

```text
Task: T040
Status: done | blocked
Changed: （ファイル一覧）
Verify: bun run test:core / bun run typecheck の結果
Notes: （残課題があれば 1 行）
```
