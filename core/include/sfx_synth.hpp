#pragma once

#include "sfx_patch.hpp"

#include <cstdint>
#include <vector>

// Renders mono Float32 PCM in [-1, 1].
// sampleRate must be passed explicitly. Never assume 44100.
std::vector<float> render(const SfxPatch& patch, int sampleRate, std::uint32_t seed);
