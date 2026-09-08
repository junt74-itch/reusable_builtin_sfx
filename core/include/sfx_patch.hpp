#pragma once

#include <cstdint>

// Packed WASM/C++ ABI. Do not reorder fields; TypeScript mirrors this layout.
inline constexpr int SFX_PACKED_FLOAT_COUNT = 21;

enum class SfxWaveform : std::uint8_t {
  Square = 0,
  Saw = 1,
  Sine = 2,
  Triangle = 3,
  Noise = 4,
  Wavetable32 = 5,
};

// Independent patch format (not Bfxr slider space).
// Units: docs/reference/sfx-units-and-algorithm.md
struct SfxPatch {
  int version = 1;
  SfxWaveform waveform = SfxWaveform::Square;
  int wavetableId = 0;
  float baseFrequency = 440.0f;       // Hz
  float frequencySlide = 0.0f;        // octaves / second
  float frequencyDeltaSlide = 0.0f;   // octaves / second^2
  float attack = 0.0f;                // seconds
  float sustain = 0.08f;              // seconds
  float decay = 0.12f;                // seconds
  float vibratoDepth = 0.0f;          // 0..1, peak relative frequency deviation
  float vibratoSpeed = 0.0f;          // Hz
  float duty = 0.5f;                  // 0..1
  float dutySweep = 0.0f;             // duty change / second
  float repeatSpeed = 0.0f;           // repeats / second, 0 = off
  float lowPassCutoff = 1.0f;         // 0..1, 1 = open / disabled
  float lowPassSweep = 0.0f;          // cutoff change / second
  float highPassCutoff = 0.0f;        // 0..1, 0 = disabled
  float highPassSweep = 0.0f;         // cutoff change / second
  float phaserOffset = 0.0f;          // 0..1
  float phaserSweep = 0.0f;           // offset change / second
  float masterVolume = 0.5f;          // 0..1
};

inline void pack_patch(const SfxPatch& patch, float* out) {
  out[0] = static_cast<float>(patch.version);
  out[1] = static_cast<float>(static_cast<int>(patch.waveform));
  out[2] = patch.baseFrequency;
  out[3] = patch.frequencySlide;
  out[4] = patch.frequencyDeltaSlide;
  out[5] = patch.attack;
  out[6] = patch.sustain;
  out[7] = patch.decay;
  out[8] = patch.vibratoDepth;
  out[9] = patch.vibratoSpeed;
  out[10] = patch.duty;
  out[11] = patch.dutySweep;
  out[12] = patch.repeatSpeed;
  out[13] = patch.lowPassCutoff;
  out[14] = patch.lowPassSweep;
  out[15] = patch.highPassCutoff;
  out[16] = patch.highPassSweep;
  out[17] = patch.phaserOffset;
  out[18] = patch.phaserSweep;
  out[19] = patch.masterVolume;
  out[20] = static_cast<float>(patch.wavetableId);
}

inline SfxPatch unpack_patch(const float* in, int count = SFX_PACKED_FLOAT_COUNT) {
  SfxPatch patch;
  patch.version = static_cast<int>(in[0]);
  const int waveform = static_cast<int>(in[1]);
  if (waveform >= 0 && waveform <= 5) {
    patch.waveform = static_cast<SfxWaveform>(waveform);
  }
  patch.baseFrequency = in[2];
  patch.frequencySlide = in[3];
  patch.frequencyDeltaSlide = in[4];
  patch.attack = in[5];
  patch.sustain = in[6];
  patch.decay = in[7];
  patch.vibratoDepth = in[8];
  patch.vibratoSpeed = in[9];
  patch.duty = in[10];
  patch.dutySweep = in[11];
  patch.repeatSpeed = in[12];
  patch.lowPassCutoff = in[13];
  patch.lowPassSweep = in[14];
  patch.highPassCutoff = in[15];
  patch.highPassSweep = in[16];
  patch.phaserOffset = in[17];
  patch.phaserSweep = in[18];
  patch.masterVolume = in[19];
  if (count >= 21) {
    const int wavetable_id = static_cast<int>(in[20]);
    patch.wavetableId = wavetable_id >= 0 ? wavetable_id : 0;
  }
  return patch;
}
