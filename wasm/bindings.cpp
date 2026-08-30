#include "sfx_synth.hpp"

#include <cstdint>

struct SfxContext {
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
      packed_len != SFX_PACKED_FLOAT_COUNT || sample_rate <= 0) {
    if (out_len != nullptr) {
      *out_len = 0;
    }
    return nullptr;
  }

  const SfxPatch patch = unpack_patch(packed);
  context->last = render(patch, sample_rate, seed);
  *out_len = static_cast<int>(context->last.size());
  return context->last.data();
}

}
