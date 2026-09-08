#include "sfx_synth.hpp"

#include "sfx_duty.hpp"
#include "sfx_envelope.hpp"
#include "sfx_filters.hpp"
#include "sfx_frequency.hpp"
#include "sfx_oscillators.hpp"
#include "sfx_phaser.hpp"
#include "sfx_wavetable.hpp"
#include "sfx_repeat.hpp"
#include "sfx_rng.hpp"

#include <algorithm>
#include <cmath>

namespace {

int sample_count_from_envelope(const SfxPatch& patch, int sampleRate) {
  const float duration = std::max(0.001f, patch.attack + patch.sustain + patch.decay);
  const int n = static_cast<int>(std::lround(static_cast<double>(duration) * static_cast<double>(sampleRate)));
  return std::max(1, n);
}

}  // namespace

std::vector<float> render(
    const SfxPatch& patch,
    int sampleRate,
    std::uint32_t seed,
    const WavetableBank* wavetables) {
  if (sampleRate <= 0) {
    return {};
  }

  const int sample_count = sample_count_from_envelope(patch, sampleRate);
  std::vector<float> pcm(static_cast<std::size_t>(sample_count));

  SfxRng rng(seed);
  FilterState filter_state{0.0f, 0.0f, 0.0f};
  PhaserState phaser_state{};

  const float sample_rate = static_cast<float>(sampleRate);
  float phase = 0.0f;
  float noise_value = noise_sample(rng);

  for (int i = 0; i < sample_count; ++i) {
    const float t = static_cast<float>(i) / sample_rate;
    const float t_local = repeat_local_time(t, patch.repeatSpeed);

    float frequency = frequency_at_time(
        t_local,
        patch.baseFrequency,
        patch.frequencySlide,
        patch.frequencyDeltaSlide);
    frequency = apply_vibrato(frequency, t_local, patch.vibratoDepth, patch.vibratoSpeed);

    const float duty = duty_at_time(t_local, patch.duty, patch.dutySweep);
    const float low_pass_cutoff =
        std::clamp(patch.lowPassCutoff + patch.lowPassSweep * t_local, 0.0f, 1.0f);
    const float high_pass_cutoff =
        std::clamp(patch.highPassCutoff + patch.highPassSweep * t_local, 0.0f, 1.0f);
    const float phaser_sweep_accum = patch.phaserSweep * t_local;

    phase += frequency / sample_rate;
    if (patch.waveform == SfxWaveform::Noise) {
      if (phase >= 1.0f) {
        phase = wrap_phase(phase);
        noise_value = noise_sample(rng);
      }
    } else {
      phase = wrap_phase(phase);
    }

    float sample = 0.0f;
    if (patch.waveform == SfxWaveform::Noise) {
      sample = noise_value;
    } else if (patch.waveform == SfxWaveform::Wavetable32) {
      if (wavetables != nullptr) {
        const Wavetable32* table = wavetables->get_wavetable(patch.wavetableId);
        if (table != nullptr) {
          sample = wavetable32_sample(*table, phase);
        }
      }
    } else {
      sample = oscillator_sample(patch.waveform, phase, duty, rng);
    }

    sample = apply_filters(sample, filter_state, low_pass_cutoff, high_pass_cutoff, sampleRate);
    sample = apply_phaser(sample, phaser_state, patch.phaserOffset, phaser_sweep_accum, sampleRate);

    const float envelope = envelope_gain(t, patch.attack, patch.sustain, patch.decay);
    sample *= envelope * patch.masterVolume;
    pcm[static_cast<std::size_t>(i)] = std::clamp(sample, -1.0f, 1.0f);
  }

  return pcm;
}
