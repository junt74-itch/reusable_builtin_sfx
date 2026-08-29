#pragma once

struct FilterState {
  float lp = 0.0f;
  float hp = 0.0f;
  float lpd = 0.0f;
};

float apply_filters(
    float sample,
    FilterState& state,
    float lowPassCutoff,
    float highPassCutoff,
    int sampleRate);
