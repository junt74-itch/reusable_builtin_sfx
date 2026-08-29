#include "sfx_frequency.hpp"

#include <algorithm>
#include <cmath>

namespace {

constexpr float kMinFrequency = 20.0f;
constexpr float kMaxFrequency = 20000.0f;
constexpr float kPi = 3.14159265358979323846f;

}  // namespace

float frequency_at_time(
    float timeSec,
    float baseFrequency,
    float frequencySlide,
    float frequencyDeltaSlide) {
  const float octaves = frequencySlide * timeSec + 0.5f * frequencyDeltaSlide * timeSec * timeSec;
  const float frequency = baseFrequency * std::pow(2.0f, octaves);
  return std::clamp(frequency, kMinFrequency, kMaxFrequency);
}

float apply_vibrato(float frequencyHz, float timeSec, float vibratoDepth, float vibratoSpeed) {
  if (vibratoDepth <= 0.0f || vibratoSpeed <= 0.0f) {
    return frequencyHz;
  }

  const float depth = std::clamp(vibratoDepth, 0.0f, 1.0f);
  const float modulated = frequencyHz * (1.0f + depth * std::sin(kPi * 2.0f * vibratoSpeed * timeSec));
  return std::clamp(modulated, kMinFrequency, kMaxFrequency);
}
