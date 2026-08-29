#include "sfx_duty.hpp"

#include <algorithm>

namespace {

constexpr float kDutyEpsilon = 0.01f;

}  // namespace

float duty_at_time(float timeSec, float duty0, float dutySweep) {
  return std::clamp(duty0 + dutySweep * timeSec, kDutyEpsilon, 1.0f - kDutyEpsilon);
}
