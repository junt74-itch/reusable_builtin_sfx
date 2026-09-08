#include "sfx_wavetable.hpp"

#include "sfx_oscillators.hpp"

#include <cstring>

bool WavetableBank::register_wavetable(int id, const std::uint8_t* samples, int length) {
  if (id < 0 || samples == nullptr || length != SFX_WAVETABLE32_SIZE) {
    return false;
  }

  const bool is_new = tables_.find(id) == tables_.end();
  if (is_new && static_cast<int>(tables_.size()) >= SFX_WAVETABLE_BANK_MAX) {
    return false;
  }

  Wavetable32 table{};
  std::memcpy(table.data(), samples, static_cast<std::size_t>(SFX_WAVETABLE32_SIZE));
  tables_[id] = table;
  return true;
}

bool WavetableBank::unregister_wavetable(int id) {
  return tables_.erase(id) > 0;
}

bool WavetableBank::has_wavetable(int id) const {
  return tables_.find(id) != tables_.end();
}

const Wavetable32* WavetableBank::get_wavetable(int id) const {
  const auto it = tables_.find(id);
  if (it == tables_.end()) {
    return nullptr;
  }
  return &it->second;
}

void WavetableBank::clear_wavetables() {
  tables_.clear();
}

int WavetableBank::size() const {
  return static_cast<int>(tables_.size());
}

float wavetable32_decode(std::uint8_t sample) {
  return static_cast<float>(sample) / 127.5f - 1.0f;
}

int wavetable32_index(float phase) {
  return static_cast<int>(wrap_phase(phase) * static_cast<float>(SFX_WAVETABLE32_SIZE)) & 31;
}

float wavetable32_sample(const Wavetable32& table, float phase) {
  return wavetable32_decode(table[static_cast<std::size_t>(wavetable32_index(phase))]);
}
