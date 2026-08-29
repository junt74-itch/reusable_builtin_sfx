#include "sfx_oscillators.hpp"

#include <algorithm>
#include <cmath>

namespace {

constexpr float kPi = 3.14159265358979323846f;
constexpr float kDutyEpsilon = 1e-6f;

float clamp_saw_duty(float duty) {
  return std::clamp(duty, kDutyEpsilon, 1.0f - kDutyEpsilon);
}

}  // namespace

float wrap_phase(float phase) {
  phase = std::fmod(phase, 1.0f);
  if (phase < 0.0f) {
    phase += 1.0f;
  }
  return phase;
}

float noise_sample(SfxRng& rng) {
  return rng.next_float() * 2.0f - 1.0f;
}

float oscillator_sample(SfxWaveform wave, float phase, float duty, SfxRng& rng) {
  const float wrapped = wrap_phase(phase);

  switch (wave) {
    case SfxWaveform::Square:
      return wrapped < duty ? 0.5f : -0.5f;

    case SfxWaveform::Saw: {
      const float clamped_duty = clamp_saw_duty(duty);
      if (wrapped < clamped_duty) {
        return -1.0f + 2.0f * wrapped / clamped_duty;
      }
      return 1.0f - 2.0f * (wrapped - clamped_duty) / (1.0f - clamped_duty);
    }

    case SfxWaveform::Sine:
      return std::sin(kPi * 2.0f * wrapped);

    case SfxWaveform::Triangle:
      if (wrapped < 0.5f) {
        return 4.0f * wrapped - 1.0f;
      }
      return 3.0f - 4.0f * wrapped;

    case SfxWaveform::Noise:
      return noise_sample(rng);

    default:
      return 0.0f;
  }
}
