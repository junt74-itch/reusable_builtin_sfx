import sineish from "../wavetables/sineish.json";
import metallic from "../wavetables/metallic.json";
import hollow from "../wavetables/hollow.json";
import kamataRaw from "../wavetables/kamata.json";

export const BUILTIN_WAVETABLE_NAMES = ["sineish", "metallic", "hollow"] as const;

export const KAMATA_WAVETABLE_NAMES = [
  "kamata00",
  "kamata01",
  "kamata02",
  "kamata03",
  "kamata04",
  "kamata05",
  "kamata06",
  "kamata07",
  "kamata08",
  "kamata09",
  "kamata10",
  "kamata11",
  "kamata12",
  "kamata13",
  "kamata14",
  "kamata15",
  "kamata16",
  "kamata17",
  "kamata18",
  "kamata19",
  "kamata20",
  "kamata21",
  "kamata22",
  "kamata23",
  "kamata24",
] as const;

export type BuiltinWavetableName = (typeof BUILTIN_WAVETABLE_NAMES)[number];
export type KamataWavetableName = (typeof KAMATA_WAVETABLE_NAMES)[number];
export type RegisteredWavetableName = BuiltinWavetableName | KamataWavetableName;

const RAW_BUILTIN_WAVETABLES: Record<string, unknown> = {
  sineish,
  metallic,
  hollow,
};

export function loadWavetable(json: unknown): Uint8Array {
  if (!Array.isArray(json)) {
    throw new Error("invalid wavetable: expected array");
  }

  if (json.length !== 32) {
    throw new Error("invalid wavetable: expected 32 samples");
  }

  const data = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const value = json[i];
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error(`invalid wavetable: sample ${i} must be an integer`);
    }
    if (value < 0 || value > 255) {
      throw new Error(`invalid wavetable: sample ${i} must be >= 0 and <= 255`);
    }
    data[i] = value;
  }

  return data;
}

export function builtinWavetables(): Record<BuiltinWavetableName, Uint8Array> {
  const wavetables = {} as Record<BuiltinWavetableName, Uint8Array>;
  for (const name of BUILTIN_WAVETABLE_NAMES) {
    wavetables[name] = loadWavetable(RAW_BUILTIN_WAVETABLES[name]);
  }
  return wavetables;
}

export function kamataWavetables(): Record<KamataWavetableName, Uint8Array> {
  const wavetables = {} as Record<KamataWavetableName, Uint8Array>;
  const raw = kamataRaw as Record<string, unknown>;
  for (const name of KAMATA_WAVETABLE_NAMES) {
    wavetables[name] = loadWavetable(raw[name]);
  }
  return wavetables;
}

export function registeredWavetables(): Record<RegisteredWavetableName, Uint8Array> {
  return {
    ...builtinWavetables(),
    ...kamataWavetables(),
  };
}
