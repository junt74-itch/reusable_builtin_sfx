import Phaser from "phaser";
import { createSfxEngine, type SfxEngine } from "../../src/index.ts";

type SfxAction = {
  label: string;
  keyLabel: string;
  preset: string;
  randomSeed?: boolean;
};

const ACTIONS: SfxAction[] = [
  { label: "UI Select", keyLabel: "1 / U", preset: "ui.select" },
  { label: "Jump", keyLabel: "2 / J", preset: "player.jump" },
  { label: "Hit", keyLabel: "3 / H", preset: "enemy.hit" },
  { label: "Explosion", keyLabel: "4 / E", preset: "explosion.basic" },
  { label: "Random Variant", keyLabel: "5 / R", preset: "explosion.basic", randomSeed: true },
];

function getPhaserAudioContext(sound: Phaser.Sound.BaseSoundManager): AudioContext | undefined {
  const manager = sound as Phaser.Sound.WebAudioSoundManager;
  return manager.context;
}

class DemoScene extends Phaser.Scene {
  private sfx: SfxEngine | undefined;

  create(): void {
    this.add.text(16, 16, "Phaser 4 SFX Demo", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "24px",
      color: "#f8fafc",
    });

    this.add.text(16, 52, "Click a button or use keyboard shortcuts.", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#94a3b8",
    });

    this.add.text(16, 76, "sampleRate: loading...", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cbd5e1",
    }).setName("sample-rate");

    let y = 112;
    for (const action of ACTIONS) {
      const button = this.add
        .text(16, y, `[${action.keyLabel}] ${action.label}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "18px",
          color: "#e0f2fe",
          backgroundColor: "#1e293b",
          padding: { x: 12, y: 8 },
        })
        .setInteractive({ useHandCursor: true });

      button.on("pointerover", () => button.setStyle({ backgroundColor: "#334155" }));
      button.on("pointerout", () => button.setStyle({ backgroundColor: "#1e293b" }));
      button.on("pointerdown", () => {
        void this.playAction(action);
      });

      y += 44;
    }

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on("keydown-ONE", () => void this.playAction(ACTIONS[0]!));
      keyboard.on("keydown-TWO", () => void this.playAction(ACTIONS[1]!));
      keyboard.on("keydown-THREE", () => void this.playAction(ACTIONS[2]!));
      keyboard.on("keydown-FOUR", () => void this.playAction(ACTIONS[3]!));
      keyboard.on("keydown-FIVE", () => void this.playAction(ACTIONS[4]!));
      keyboard.on("keydown-U", () => void this.playAction(ACTIONS[0]!));
      keyboard.on("keydown-J", () => void this.playAction(ACTIONS[1]!));
      keyboard.on("keydown-H", () => void this.playAction(ACTIONS[2]!));
      keyboard.on("keydown-E", () => void this.playAction(ACTIONS[3]!));
      keyboard.on("keydown-R", () => void this.playAction(ACTIONS[4]!));
    }

    void this.initSfx();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sfx?.dispose();
      this.sfx = undefined;
    });
  }

  private async initSfx(): Promise<void> {
    const audioContext = getPhaserAudioContext(this.sound);
    if (!audioContext) {
      throw new Error("Phaser WebAudioSoundManager is required for this demo");
    }

    this.sfx = await createSfxEngine({ audioContext });
    const sampleRateText = this.children.getByName("sample-rate");
    if (sampleRateText instanceof Phaser.GameObjects.Text) {
      sampleRateText.setText(`sampleRate: ${audioContext.sampleRate} Hz`);
    }
  }

  private async playAction(action: SfxAction): Promise<void> {
    if (!this.sfx) {
      return;
    }

    if (action.randomSeed) {
      const seed = Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
      await this.sfx.play(action.preset, { seed });
      return;
    }

    await this.sfx.play(action.preset);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 420,
  backgroundColor: "#111827",
  parent: "game",
  scene: DemoScene,
};

new Phaser.Game(config);
