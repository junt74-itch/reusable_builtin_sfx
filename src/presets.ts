import { validatePatch } from "./patch.ts";
import type { SfxPatchV1 } from "./types.ts";

import uiCancel from "../presets/ui.cancel.json";
import uiConfirm from "../presets/ui.confirm.json";
import uiSelect from "../presets/ui.select.json";
import itemCoin from "../presets/item.coin.json";
import itemPickup from "../presets/item.pickup.json";
import playerDamage from "../presets/player.damage.json";
import playerJump from "../presets/player.jump.json";
import enemyHit from "../presets/enemy.hit.json";
import weaponShot from "../presets/weapon.shot.json";
import explosionBasic from "../presets/explosion.basic.json";
import powerup from "../presets/powerup.json";
import warning from "../presets/warning.json";

export const BUILTIN_PRESET_NAMES = [
  "ui.select",
  "ui.cancel",
  "ui.confirm",
  "item.pickup",
  "item.coin",
  "player.jump",
  "player.damage",
  "enemy.hit",
  "weapon.shot",
  "explosion.basic",
  "powerup",
  "warning",
] as const;

export type BuiltinPresetName = (typeof BUILTIN_PRESET_NAMES)[number];

const RAW_BUILTIN_PRESETS: Record<string, unknown> = {
  "ui.select": uiSelect,
  "ui.cancel": uiCancel,
  "ui.confirm": uiConfirm,
  "item.pickup": itemPickup,
  "item.coin": itemCoin,
  "player.jump": playerJump,
  "player.damage": playerDamage,
  "enemy.hit": enemyHit,
  "weapon.shot": weaponShot,
  "explosion.basic": explosionBasic,
  powerup,
  warning,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePresetRecord(json: unknown): Record<string, SfxPatchV1> {
  if (!isRecord(json)) {
    throw new Error("invalid presets: expected object");
  }

  const presets: Record<string, SfxPatchV1> = {};
  for (const [name, patch] of Object.entries(json)) {
    presets[name] = validatePatch(patch);
  }
  return presets;
}

export function loadPresets(json: unknown): Record<string, SfxPatchV1> {
  return validatePresetRecord(json);
}

export function mergePresets(
  builtin: Record<string, SfxPatchV1>,
  override: Record<string, SfxPatchV1>,
): Record<string, SfxPatchV1> {
  return { ...builtin, ...override };
}

export function builtinPresets(): Record<string, SfxPatchV1> {
  return validatePresetRecord(RAW_BUILTIN_PRESETS);
}
