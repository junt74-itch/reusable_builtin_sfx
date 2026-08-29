import { SFX_WAVEFORMS, type SfxPatchV1, type SfxWaveform } from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireFinite(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`invalid patch: ${field} must be a finite number`);
  }
  return value;
}

function optionalFinite(value: unknown, field: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requireFinite(value, field);
}

function requireWaveform(value: unknown): SfxWaveform {
  if (typeof value !== "string" || !SFX_WAVEFORMS.includes(value as SfxWaveform)) {
    throw new Error(`invalid patch: waveform must be one of ${SFX_WAVEFORMS.join(", ")}`);
  }
  return value as SfxWaveform;
}

function requireRange(value: number, field: string, min: number, max: number): void {
  if (value < min || value > max) {
    throw new Error(`invalid patch: ${field} must be >= ${min} and <= ${max}`);
  }
}

export function validatePatch(input: unknown): SfxPatchV1 {
  if (!isRecord(input)) {
    throw new Error("invalid patch: expected object");
  }

  if (input.version !== 1) {
    throw new Error("invalid patch: version must be 1");
  }

  const waveform = requireWaveform(input.waveform);

  const baseFrequency = requireFinite(input.baseFrequency, "baseFrequency");
  if (baseFrequency <= 0 || baseFrequency > 20000) {
    throw new Error("invalid patch: baseFrequency must be > 0 and <= 20000");
  }

  const attack = requireFinite(input.attack, "attack");
  const sustain = requireFinite(input.sustain, "sustain");
  const decay = requireFinite(input.decay, "decay");
  requireRange(attack, "attack", 0, 5);
  requireRange(sustain, "sustain", 0, 5);
  requireRange(decay, "decay", 0, 5);

  const frequencySlide = requireFinite(input.frequencySlide, "frequencySlide");
  const frequencyDeltaSlide = requireFinite(input.frequencyDeltaSlide, "frequencyDeltaSlide");
  const vibratoDepth = requireFinite(input.vibratoDepth, "vibratoDepth");
  const vibratoSpeed = requireFinite(input.vibratoSpeed, "vibratoSpeed");

  const dutyRaw = optionalFinite(input.duty, "duty");
  const duty = dutyRaw ?? 0.5;
  if (dutyRaw !== undefined) {
    requireRange(duty, "duty", 0, 1);
  }

  const masterVolumeRaw = optionalFinite(input.masterVolume, "masterVolume");
  const masterVolume = masterVolumeRaw ?? 0.5;
  if (masterVolumeRaw !== undefined) {
    requireRange(masterVolume, "masterVolume", 0, 1);
  }

  const dutySweep = optionalFinite(input.dutySweep, "dutySweep") ?? 0;
  const repeatSpeed = optionalFinite(input.repeatSpeed, "repeatSpeed") ?? 0;
  const lowPassCutoff = optionalFinite(input.lowPassCutoff, "lowPassCutoff") ?? 1;
  const lowPassSweep = optionalFinite(input.lowPassSweep, "lowPassSweep") ?? 0;
  const highPassCutoff = optionalFinite(input.highPassCutoff, "highPassCutoff") ?? 0;
  const highPassSweep = optionalFinite(input.highPassSweep, "highPassSweep") ?? 0;
  const phaserOffset = optionalFinite(input.phaserOffset, "phaserOffset") ?? 0;
  const phaserSweep = optionalFinite(input.phaserSweep, "phaserSweep") ?? 0;

  return {
    version: 1,
    waveform,
    baseFrequency,
    frequencySlide,
    frequencyDeltaSlide,
    attack,
    sustain,
    decay,
    vibratoDepth,
    vibratoSpeed,
    duty,
    dutySweep,
    repeatSpeed,
    lowPassCutoff,
    lowPassSweep,
    highPassCutoff,
    highPassSweep,
    phaserOffset,
    phaserSweep,
    masterVolume,
  };
}
