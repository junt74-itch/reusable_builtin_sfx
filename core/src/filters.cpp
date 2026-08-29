#include "sfx_filters.hpp"

#include <algorithm>
#include <cmath>

namespace {

constexpr float kPi = 3.14159265358979323846f;
constexpr float kLpBypassCutoff = 0.99f;
constexpr float kHpBypassCutoff = 0.001f;

float normalized_cutoff_to_hz(float normalized, int sampleRate) {
  const float clamped = std::clamp(normalized, 0.0f, 0.999f);
  const float sr = static_cast<float>(sampleRate);
  return clamped * 8.0f * sr / (1.0f - clamped);
}

float one_pole_alpha(float normalized, int sampleRate) {
  const float fc = normalized_cutoff_to_hz(normalized, sampleRate);
  const float sr = static_cast<float>(sampleRate);
  const float alpha = 1.0f - std::exp(-2.0f * kPi * fc / sr);
  return std::min(0.1f, std::max(0.0f, alpha));
}

float lp_damping(float alpha) {
  return std::min(0.8f, 0.05f + 5.0f * alpha);
}

}  // namespace

float apply_filters(
    float sample,
    FilterState& state,
    float lowPassCutoff,
    float highPassCutoff,
    int sampleRate) {
  if (sampleRate <= 0) {
    return sample;
  }

  const float previous_lp = state.lp;
  float lp_out = sample;

  if (lowPassCutoff < kLpBypassCutoff) {
    const float fltw = one_pole_alpha(lowPassCutoff, sampleRate);
    const float fltdmp = lp_damping(fltw);
    state.lpd += (sample - state.lp) * fltw;
    state.lpd -= state.lpd * fltdmp;
    state.lp += state.lpd;
    lp_out = state.lp;
  } else {
    state.lp = sample;
    state.lpd = 0.0f;
    lp_out = sample;
  }

  if (highPassCutoff > kHpBypassCutoff) {
    const float flthp = std::max(0.00001f, one_pole_alpha(highPassCutoff, sampleRate));
    state.hp += lp_out - previous_lp;
    state.hp -= state.hp * flthp;
    return state.hp;
  }

  state.hp = 0.0f;
  return lp_out;
}
