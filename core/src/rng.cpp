#include "sfx_rng.hpp"

namespace {

constexpr float kInvU32Max = 1.0f / 4294967296.0f;

}  // namespace

SfxRng::SfxRng(std::uint32_t seed) : seed_(seed), state_(seed == 0 ? 1 : seed) {}

std::uint32_t SfxRng::next_u32() {
  std::uint32_t x = state_;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  state_ = x;
  return x;
}

float SfxRng::next_float() {
  return static_cast<float>(next_u32()) * kInvU32Max;
}
