# T410 Phaser 4 example

## Status

**DONE**

## Depends on

- T340 T400

## Goal

`examples/phaser4` でキーまたはボタンから 5 種の SE を鳴らす。**ライブラリ本体は Phaser に依存しない。**

## Out of scope

- Phaser プラグイン化
- Phaser の sound.add への無理な統合（Web Audio 直でも、Game 内の AudioContext 再利用でも可）

## Files

- 作成: `examples/phaser4/main.ts`, `examples/phaser4/index.html` またはルート Vite の別入力
- 変更: `package.json`（devDependency に `phaser@4.2.1` のみ。dependencies には入れない）, `vite.config.ts`（`bun run dev:phaser` など）
- 禁止: `src/` から `phaser` を import

## Spec

シーン内で:

1. UI Select
2. Jump
3. Hit
4. Explosion
5. Random Variant

Phaser 4.2.1（姉妹リポジトリ `reusable-phaser4-window-system` と同じ）。

`createSfxEngine` に `game.sound.context` または相当の AudioContext を渡せるなら渡す。渡せない場合は独立 AudioContext でよい。

## Acceptance Criteria

- [x] `src/` の `bun run build` 成果物に phaser が含まれない
- [x] `package.json` の `dependencies` が空のまま（phaser は devDependencies）
- [x] 5 アクションが操作できる

## Verify

```bash
bun run typecheck
bun run build
bun run dev:phaser   # または同等スクリプト
```
