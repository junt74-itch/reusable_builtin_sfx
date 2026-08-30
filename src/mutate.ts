import { validatePatch } from "./patch.ts";
import type { SfxPatchV1 } from "./types.ts";

export interface MutatePatchOptions {
  amount?: number;
  seed?: number;
}

const WAKE_THRESHOLD = 0.35;
const MIN_ENVELOPE_SEC = 0.01;

class MutateRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed === 0 ? 1 : seed;
  }

  nextU32(): number {
    let x = this.state >>> 0;
    x ^= (x << 13) >>> 0;
    x ^= x >>> 17;
    x ^= (x << 5) >>> 0;
    this.state = x >>> 0;
    return this.state;
  }

  nextFloat(): number {
    return this.nextU32() / 4294967296;
  }

  signed(): number {
    return this.nextFloat() * 2 - 1;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveAmount(amount: number | undefined): number {
  const value = amount ?? 0;
  if (!Number.isFinite(value)) {
    throw new Error("invalid mutate: amount must be a finite number");
  }
  return clamp(value, 0, 1);
}

function resolveSeed(seed: number | undefined): number {
  const value = seed ?? 0;
  if (!Number.isFinite(value)) {
    throw new Error("invalid mutate: seed must be a finite number");
  }
  return value >>> 0;
}

function jitter(value: number, scale: number, amount: number, rng: MutateRng): number {
  return value + rng.signed() * scale * amount;
}

function maybeWake(
  value: number,
  inactive: boolean,
  scale: number,
  amount: number,
  rng: MutateRng,
): number {
  if (inactive && amount < WAKE_THRESHOLD) {
    return value;
  }
  if (inactive && rng.nextFloat() > amount) {
    return value;
  }
  return jitter(value, scale, amount, rng);
}

export function mutatePatch(base: SfxPatchV1, options: MutatePatchOptions = {}): SfxPatchV1 {
  const validated = validatePatch(base);
  const amount = resolveAmount(options.amount);
  const seed = resolveSeed(options.seed);
  if (amount === 0) {
    return validated;
  }

  const rng = new MutateRng(seed);
  const duty = validated.duty ?? 0.5;
  const dutySweep = validated.dutySweep ?? 0;
  const repeatSpeed = validated.repeatSpeed ?? 0;
  const lowPassCutoff = validated.lowPassCutoff ?? 1;
  const lowPassSweep = validated.lowPassSweep ?? 0;
  const highPassCutoff = validated.highPassCutoff ?? 0;
  const highPassSweep = validated.highPassSweep ?? 0;
  const phaserOffset = validated.phaserOffset ?? 0;
  const phaserSweep = validated.phaserSweep ?? 0;
  const masterVolume = validated.masterVolume ?? 0.5;

  const attack = clamp(jitter(validated.attack, 0.04, amount, rng), 0, 5);
  const sustain = clamp(jitter(validated.sustain, 0.06, amount, rng), 0, 5);
  let decay = clamp(jitter(validated.decay, 0.08, amount, rng), 0, 5);
  if (attack + sustain + decay < MIN_ENVELOPE_SEC) {
    decay = MIN_ENVELOPE_SEC;
  }

  return validatePatch({
    version: 1,
    waveform: validated.waveform,
    baseFrequency: clamp(validated.baseFrequency * (1 + rng.signed() * 0.4 * amount), 20, 12000),
    frequencySlide: clamp(jitter(validated.frequencySlide, 2.5, amount, rng), -16, 16),
    frequencyDeltaSlide: clamp(
      maybeWake(validated.frequencyDeltaSlide, validated.frequencyDeltaSlide === 0, 1.2, amount, rng),
      -8,
      8,
    ),
    attack,
    sustain,
    decay,
    vibratoDepth: clamp(
      maybeWake(validated.vibratoDepth, validated.vibratoDepth === 0, 0.2, amount, rng),
      0,
      1,
    ),
    vibratoSpeed: clamp(
      maybeWake(validated.vibratoSpeed, validated.vibratoSpeed === 0, 10, amount, rng),
      0,
      40,
    ),
    duty: clamp(jitter(duty, 0.15, amount, rng), 0, 1),
    dutySweep: clamp(maybeWake(dutySweep, dutySweep === 0, 0.4, amount, rng), -2, 2),
    repeatSpeed: clamp(maybeWake(repeatSpeed, repeatSpeed === 0, 2, amount, rng), 0, 20),
    lowPassCutoff: clamp(maybeWake(lowPassCutoff, lowPassCutoff >= 1, 0.25, amount, rng), 0, 1),
    lowPassSweep: clamp(maybeWake(lowPassSweep, lowPassSweep === 0, 0.4, amount, rng), -2, 2),
    highPassCutoff: clamp(maybeWake(highPassCutoff, highPassCutoff === 0, 0.12, amount, rng), 0, 1),
    highPassSweep: clamp(maybeWake(highPassSweep, highPassSweep === 0, 0.4, amount, rng), -2, 2),
    phaserOffset: clamp(maybeWake(phaserOffset, phaserOffset === 0, 0.2, amount, rng), 0, 1),
    phaserSweep: clamp(maybeWake(phaserSweep, phaserSweep === 0, 0.4, amount, rng), -2, 2),
    masterVolume: clamp(jitter(masterVolume, 0.08, amount, rng), 0.05, 1),
  });
}
