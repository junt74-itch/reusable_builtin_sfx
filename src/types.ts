export const SFX_PACKED_FLOAT_COUNT = 21;

export const SFX_WAVEFORMS = ["square", "saw", "sine", "triangle", "noise", "wavetable32"] as const;

export type SfxWaveform = (typeof SFX_WAVEFORMS)[number];

export interface SfxPatchV1 {
  version: 1;
  waveform: SfxWaveform;
  /** Named wavetable reference; resolved to wavetableId before render. */
  wavetable?: string;
  wavetableId?: number;
  baseFrequency: number;
  frequencySlide: number;
  frequencyDeltaSlide: number;
  attack: number;
  sustain: number;
  decay: number;
  vibratoDepth: number;
  vibratoSpeed: number;
  duty?: number;
  dutySweep?: number;
  repeatSpeed?: number;
  lowPassCutoff?: number;
  lowPassSweep?: number;
  highPassCutoff?: number;
  highPassSweep?: number;
  phaserOffset?: number;
  phaserSweep?: number;
  masterVolume?: number;
}

export interface PlayOptions {
  seed?: number;
  volume?: number;
  pan?: number;
}

export interface RenderOptions {
  seed?: number;
  sampleRate?: number;
}

export interface CreateSfxEngineOptions {
  sampleRate?: number;
  presets?: Record<string, SfxPatchV1>;
  audioContext?: AudioContext | undefined;
}

export interface SfxEngine {
  play(nameOrPatch: string | SfxPatchV1, options?: PlayOptions): Promise<void>;
  render(nameOrPatch: string | SfxPatchV1, options?: RenderOptions): Promise<Float32Array>;
  preload(names: string[]): Promise<void>;
  clearCache(): void;
  registerWavetable(nameOrId: string | number, data: Uint8Array): void;
  unregisterWavetable(nameOrId: string | number): void;
  clearWavetables(): void;
  setMasterVolume(volume: number): void;
  dispose(): void;
}

export const WAVEFORM_TO_INDEX: Record<SfxWaveform, number> = {
  square: 0,
  saw: 1,
  sine: 2,
  triangle: 3,
  noise: 4,
  wavetable32: 5,
};

/** Mirrors `pack_patch` indices in `core/include/sfx_patch.hpp` (0..20). */
export const PACKED_PATCH_FIELD_ORDER = [
  "version",
  "waveform",
  "baseFrequency",
  "frequencySlide",
  "frequencyDeltaSlide",
  "attack",
  "sustain",
  "decay",
  "vibratoDepth",
  "vibratoSpeed",
  "duty",
  "dutySweep",
  "repeatSpeed",
  "lowPassCutoff",
  "lowPassSweep",
  "highPassCutoff",
  "highPassSweep",
  "phaserOffset",
  "phaserSweep",
  "masterVolume",
  "wavetableId",
] as const;

export function packPatch(patch: SfxPatchV1): Float32Array {
  const packed = new Float32Array(SFX_PACKED_FLOAT_COUNT);
  packed[0] = patch.version;
  packed[1] = WAVEFORM_TO_INDEX[patch.waveform];
  packed[2] = patch.baseFrequency;
  packed[3] = patch.frequencySlide;
  packed[4] = patch.frequencyDeltaSlide;
  packed[5] = patch.attack;
  packed[6] = patch.sustain;
  packed[7] = patch.decay;
  packed[8] = patch.vibratoDepth;
  packed[9] = patch.vibratoSpeed;
  packed[10] = patch.duty ?? 0.5;
  packed[11] = patch.dutySweep ?? 0;
  packed[12] = patch.repeatSpeed ?? 0;
  packed[13] = patch.lowPassCutoff ?? 1;
  packed[14] = patch.lowPassSweep ?? 0;
  packed[15] = patch.highPassCutoff ?? 0;
  packed[16] = patch.highPassSweep ?? 0;
  packed[17] = patch.phaserOffset ?? 0;
  packed[18] = patch.phaserSweep ?? 0;
  packed[19] = patch.masterVolume ?? 0.5;
  packed[20] = patch.wavetableId ?? 0;
  return packed;
}

export function defaultPatch(overrides: Partial<SfxPatchV1> = {}): SfxPatchV1 {
  return {
    version: 1,
    waveform: "sine",
    baseFrequency: 440,
    frequencySlide: 0,
    frequencyDeltaSlide: 0,
    attack: 0,
    sustain: 0.08,
    decay: 0.12,
    vibratoDepth: 0,
    vibratoSpeed: 0,
    duty: 0.5,
    masterVolume: 0.5,
    ...overrides,
  };
}
