#pragma once

#include <array>
#include <cstdint>
#include <unordered_map>

inline constexpr int SFX_WAVETABLE32_SIZE = 32;
inline constexpr int SFX_WAVETABLE_BANK_MAX = 256;
using Wavetable32 = std::array<std::uint8_t, 32>;

float wavetable32_decode(std::uint8_t sample);
int wavetable32_index(float phase);
float wavetable32_sample(const Wavetable32& table, float phase);

class WavetableBank {
 public:
  bool register_wavetable(int id, const std::uint8_t* samples, int length);
  bool unregister_wavetable(int id);
  bool has_wavetable(int id) const;
  const Wavetable32* get_wavetable(int id) const;
  void clear_wavetables();
  int size() const;

 private:
  std::unordered_map<int, Wavetable32> tables_;
};
