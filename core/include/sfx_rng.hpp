#pragma once

#include <cstdint>

// Deterministic PRNG. Do not use std::rand().
class SfxRng {
 public:
  explicit SfxRng(std::uint32_t seed);

  std::uint32_t seed() const { return seed_; }

  std::uint32_t next_u32();

  // Returns a value in [0, 1).
  float next_float();

 private:
  std::uint32_t seed_;
  std::uint32_t state_;
};
