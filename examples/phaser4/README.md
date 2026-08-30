# Phaser 4 example

ライブラリ本体は Phaser に依存しません。`phaser@4.2.1` は devDependency のみです。

## 起動

```bash
bun run dev:phaser
```

ブラウザで `http://localhost:5174/` を開きます。

## 操作

| アクション | キー | preset |
| --- | --- | --- |
| UI Select | `1` / `U` | `ui.select` |
| Jump | `2` / `J` | `player.jump` |
| Hit | `3` / `H` | `enemy.hit` |
| Explosion | `4` / `E` | `explosion.basic` |
| Random Variant | `5` / `R` | `explosion.basic`（seed ランダム） |

`createSfxEngine` には Phaser の `game.sound.context`（WebAudioSoundManager）を渡しています。
