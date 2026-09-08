import { describe, expect, test } from "bun:test";
import { defaultPatch } from "../src/types.ts";
import {
  BUILTIN_PRESET_NAMES,
  builtinPresets,
  loadPresets,
  mergePresets,
} from "../src/presets.ts";

describe("presets", () => {
  test("builtin presets include all named entries", () => {
    expect(BUILTIN_PRESET_NAMES.length).toBeGreaterThanOrEqual(12);
    const presets = builtinPresets();
    expect(Object.keys(presets).length).toBeGreaterThanOrEqual(12);
    for (const name of BUILTIN_PRESET_NAMES) {
      expect(presets[name]?.version).toBe(1);
    }
  });

  test("loadPresets validates SfxPatchV1 objects", () => {
    const custom = loadPresets({
      "custom.beep": defaultPatch({ waveform: "sine", baseFrequency: 512 }),
    });
    expect(custom["custom.beep"]?.baseFrequency).toBe(512);
  });

  test("mergePresets lets external JSON override builtin entries", () => {
    const builtin = builtinPresets();
    const override = loadPresets({
      "ui.select": defaultPatch({ waveform: "square", baseFrequency: 1200, sustain: 0.01, decay: 0.02 }),
      "mod.custom": defaultPatch({ waveform: "triangle", baseFrequency: 300 }),
    });
    const merged = mergePresets(builtin, override);

    expect(merged["ui.select"]?.waveform).toBe("square");
    expect(merged["ui.select"]?.baseFrequency).toBe(1200);
    expect(merged["mod.custom"]?.waveform).toBe("triangle");
    expect(merged["ui.cancel"]?.waveform).toBe(builtin["ui.cancel"]?.waveform);
  });

  test("unknown waveform in JSON throws", () => {
    expect(() =>
      loadPresets({
        bad: {
          ...defaultPatch(),
          waveform: "pulse",
        },
      }),
    ).toThrow(/waveform/);
  });

  test("does not depend on Phaser", async () => {
    const source = await Bun.file("src/presets.ts").text();
    expect(source.toLowerCase().includes("phaser")).toBe(false);
  });
});
