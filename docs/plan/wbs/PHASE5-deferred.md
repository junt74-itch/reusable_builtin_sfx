# Phase 5（T500–T540 完了）

親計画の Phase 5。MVP（T000–T430）完了後の作者向け tooling。

実装は **1 タスクずつ**。[`README.md`](README.md) の実行順に従う。

| タスク | 内容 | 状態 |
| --- | --- | --- |
| [T500](T500-mutate.md) | `mutatePatch` API | DONE |
| [T510](T510-authoring-gacha.md) | 作者向け GUI（ガチャ + 履歴 + コピー） | DONE |
| [T520](T520-authoring-sliders.md) | 選択中 patch の単位付き編集 | DONE |
| [T530](T530-wav-export.md) | PCM → 16-bit WAV | DONE |
| [T540](T540-cli-mutate.md) | `bun run sfx mutate` | DONE |

まだ入れないもの:

- `bun run sfx random`（カテゴリ無しの全ランダム生成）
- `bun run sfx render`（CLI からの WAV 書き出し。GUI の Download WAV は T530 済み）
- Bfxr UI / ファイル互換
