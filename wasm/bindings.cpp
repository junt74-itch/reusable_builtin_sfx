#include "sfx_synth.hpp"
#include "sfx_wavetable.hpp"

#include <cstdint>

struct SfxContext {
  WavetableBank bank;
  std::vector<float> last;
};

extern "C" {

void* create_context() { return new SfxContext(); }

void destroy_context(void* ctx) {
  if (ctx != nullptr) {
    delete static_cast<SfxContext*>(ctx);
  }
}

float* render_patch(void* ctx, const float* packed, int packed_len, int sample_rate,
                    std::uint32_t seed, int* out_len) {
  auto* context = static_cast<SfxContext*>(ctx);
  if (context == nullptr || packed == nullptr || out_len == nullptr ||
      (packed_len != 20 && packed_len != SFX_PACKED_FLOAT_COUNT) || sample_rate <= 0) {
    if (out_len != nullptr) {
      *out_len = 0;
    }
    return nullptr;
  }

  const SfxPatch patch = unpack_patch(packed, packed_len);
  context->last = render(patch, sample_rate, seed, &context->bank);
  *out_len = static_cast<int>(context->last.size());
  return context->last.data();
}

int register_wavetable(void* ctx, int id, const std::uint8_t* data, int length) {
  if (ctx == nullptr || data == nullptr || id < 0 || length != SFX_WAVETABLE32_SIZE) {
    return 0;
  }
  auto* context = static_cast<SfxContext*>(ctx);
  return context->bank.register_wavetable(id, data, length) ? 1 : 0;
}

int unregister_wavetable(void* ctx, int id) {
  if (ctx == nullptr || id < 0) {
    return 0;
  }
  auto* context = static_cast<SfxContext*>(ctx);
  return context->bank.unregister_wavetable(id) ? 1 : 0;
}

void clear_wavetables(void* ctx) {
  if (ctx == nullptr) {
    return;
  }
  static_cast<SfxContext*>(ctx)->bank.clear_wavetables();
}

}
