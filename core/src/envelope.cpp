#include "sfx_envelope.hpp"

float envelope_gain(float timeSec, float attack, float sustain, float decay) {
  if (timeSec < 0.0f) {
    return 0.0f;
  }

  const float total = attack + sustain + decay;
  if (total <= 0.0f) {
    return 0.0f;
  }

  if (timeSec >= total) {
    return 0.0f;
  }

  if (attack > 0.0f && timeSec < attack) {
    return timeSec / attack;
  }

  if (timeSec < attack + sustain) {
    return 1.0f;
  }

  const float decay_time = timeSec - attack - sustain;
  if (decay <= 0.0f) {
    return 0.0f;
  }

  return 1.0f - decay_time / decay;
}
