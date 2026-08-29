#pragma once

#include "sfx_patch.hpp"
#include "sfx_rng.hpp"

float wrap_phase(float phase);

float noise_sample(SfxRng& rng);

float oscillator_sample(SfxWaveform wave, float phase, float duty, SfxRng& rng);
