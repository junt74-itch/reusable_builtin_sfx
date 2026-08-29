# T400 vanilla example

## Depends on

- T340 T350（実音は T130 以降）

## Goal

`bun run dev` でボタンから複数 SE が鳴る。Phaser に依存しない。

## Out of scope

- Phaser
- エディタ UI（Bfxr 再現）

## Files

- 変更: `examples/vanilla/main.ts`, `index.html`
- 必要なら: `examples/vanilla/style.css`

## Spec

最低ボタン:

1. ui.select
2. player.jump
3. enemy.hit
4. explosion.basic
5. Random variant（同じ preset、seed を毎回変える）

クリックで `AudioContext.resume` 相当が走る（既存 `play` の resume）。無音スタブのままマージしない（T130 未完ならこのタスクを開始しない）。

画面に sampleRate を表示する。

## Acceptance Criteria

- [ ] Phaser import が example に無い
- [ ] `bun run typecheck` が examples を含んだまま通る
- [ ] README から `bun run dev` で開ける

## Verify

```bash
bun run typecheck
bun run dev
```

ブラウザで 5 ボタンを実際に押して聴く。自動化できない場合は手動確認を完了報告に書く。
