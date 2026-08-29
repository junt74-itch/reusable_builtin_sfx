import { describe, expect, test } from "bun:test";
import { validatePatch } from "../src/patch.ts";
import {
  defaultPatch,
  packPatch,
  PACKED_PATCH_FIELD_ORDER,
  SFX_PACKED_FLOAT_COUNT,
  WAVEFORM_TO_INDEX,
} from "../src/types.ts";

describe("validatePatch", () => {
  test("accepts a valid patch", () => {
    const patch = validatePatch(defaultPatch({ waveform: "square", baseFrequency: 220 }));
    expect(patch.version).toBe(1);
    expect(patch.waveform).toBe("square");
    expect(patch.baseFrequency).toBe(220);
    expect(patch.duty).toBe(0.5);
    expect(patch.masterVolume).toBe(0.5);
  });

  test("applies defaults for omitted duty and masterVolume", () => {
    const { duty: _duty, masterVolume: _masterVolume, ...rest } = defaultPatch();
    const patch = validatePatch(rest);
    expect(patch.duty).toBe(0.5);
    expect(patch.masterVolume).toBe(0.5);
  });

  test("ignores unknown keys", () => {
    const patch = validatePatch({ ...defaultPatch(), futureField: 123 });
    expect(patch.version).toBe(1);
  });

  test("throws on invalid waveform", () => {
    expect(() => validatePatch({ ...defaultPatch(), waveform: "pulse" })).toThrow(/waveform/);
  });

  test("throws on NaN", () => {
    expect(() => validatePatch({ ...defaultPatch(), sustain: Number.NaN })).toThrow(/finite number/);
  });

  test("throws on negative attack", () => {
    expect(() => validatePatch({ ...defaultPatch(), attack: -0.01 })).toThrow(/attack/);
  });
});

describe("packPatch ABI", () => {
  test("SFX_PACKED_FLOAT_COUNT is 20", () => {
    expect(SFX_PACKED_FLOAT_COUNT).toBe(20);
    expect(PACKED_PATCH_FIELD_ORDER.length).toBe(20);
  });

  test("packed layout matches core/include/sfx_patch.hpp order", () => {
    const patch = validatePatch(
      defaultPatch({
        waveform: "triangle",
        baseFrequency: 880,
        frequencySlide: 1,
        frequencyDeltaSlide: 2,
        attack: 0.01,
        sustain: 0.02,
        decay: 0.03,
        vibratoDepth: 0.1,
        vibratoSpeed: 5,
        duty: 0.25,
        dutySweep: 0.5,
        repeatSpeed: 2,
        lowPassCutoff: 0.8,
        lowPassSweep: 0.1,
        highPassCutoff: 0.2,
        highPassSweep: 0.3,
        phaserOffset: 0.4,
        phaserSweep: 0.5,
        masterVolume: 0.9,
      }),
    );
    const packed = packPatch(patch);

    expect(packed.length).toBe(SFX_PACKED_FLOAT_COUNT);
    expect(PACKED_PATCH_FIELD_ORDER[0]).toBe("version");
    expect(PACKED_PATCH_FIELD_ORDER[1]).toBe("waveform");
    expect(PACKED_PATCH_FIELD_ORDER[19]).toBe("masterVolume");

    expect(packed[0]).toBe(1);
    expect(packed[1]).toBe(WAVEFORM_TO_INDEX.triangle);
    expect(packed[2]).toBe(880);
    expect(packed[3]).toBe(1);
    expect(packed[4]).toBe(2);
    expect(packed[5]).toBeCloseTo(0.01);
    expect(packed[6]).toBeCloseTo(0.02);
    expect(packed[7]).toBeCloseTo(0.03);
    expect(packed[8]).toBeCloseTo(0.1);
    expect(packed[9]).toBe(5);
    expect(packed[10]).toBeCloseTo(0.25);
    expect(packed[11]).toBeCloseTo(0.5);
    expect(packed[12]).toBe(2);
    expect(packed[13]).toBeCloseTo(0.8);
    expect(packed[14]).toBeCloseTo(0.1);
    expect(packed[15]).toBeCloseTo(0.2);
    expect(packed[16]).toBeCloseTo(0.3);
    expect(packed[17]).toBeCloseTo(0.4);
    expect(packed[18]).toBeCloseTo(0.5);
    expect(packed[19]).toBeCloseTo(0.9);
  });
});
