#include "sfx_repeat.hpp"

#include <cmath>

float repeat_local_time(float timeSec, float repeatSpeed) {
  if (repeatSpeed <= 0.0f) {
    return timeSec;
  }

  const float period = 1.0f / repeatSpeed;
  float local = std::fmod(timeSec, period);
  if (local < 0.0f) {
    local += period;
  }
  return local;
}
