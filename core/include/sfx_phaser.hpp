#pragma once

struct PhaserState {
  static constexpr int kBufferSize = 1024;

  float buffer[kBufferSize]{};
  int write_index = 0;
};

float apply_phaser(
    float sample,
    PhaserState& state,
    float offset,
    float sweepAccum,
    int sampleRate);
