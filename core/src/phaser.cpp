#include "sfx_phaser.hpp"

#include <algorithm>
#include <cmath>

namespace {

constexpr float kMaxDelaySec = 0.01f;

int delay_samples(float offset, float sweepAccum, int sampleRate) {
  if (sampleRate <= 0) {
    return 0;
  }

  const float effective = std::clamp(offset + sweepAccum, 0.0f, 1.0f);
  if (effective <= 0.0f) {
    return 0;
  }

  const float max_delay = kMaxDelaySec * static_cast<float>(sampleRate);
  return static_cast<int>(std::floor(effective * effective * max_delay));
}

}  // namespace

float apply_phaser(
    float sample,
    PhaserState& state,
    float offset,
    float sweepAccum,
    int sampleRate) {
  if (sampleRate <= 0) {
    return sample;
  }

  const int delay = delay_samples(offset, sweepAccum, sampleRate);

  state.buffer[state.write_index] = sample;

  if (delay <= 0) {
    state.write_index = (state.write_index + 1) % PhaserState::kBufferSize;
    return sample;
  }

  const int read_index =
      (state.write_index - delay + PhaserState::kBufferSize) % PhaserState::kBufferSize;
  const float delayed = state.buffer[read_index];
  state.write_index = (state.write_index + 1) % PhaserState::kBufferSize;
  return sample + delayed;
}
