#include "sfx_phaser.hpp"
#include "sfx_repeat.hpp"
#include "sfx_duty.hpp"
#include "sfx_envelope.hpp"
#include "sfx_filters.hpp"
#include "sfx_frequency.hpp"
#include "sfx_patch.hpp"
#include "sfx_oscillators.hpp"
#include "sfx_rng.hpp"
#include "sfx_synth.hpp"

#include <cmath>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <vector>

namespace {

int failures = 0;

void check(bool cond, const char* expr, const char* file, int line) {
  if (!cond) {
    std::cerr << "FAIL " << file << ":" << line << " " << expr << "\n";
    ++failures;
  }
}

#define CHECK(expr) check(static_cast<bool>(expr), #expr, __FILE__, __LINE__)

constexpr float kPi = 3.14159265358979323846f;

float filter_sine_peak(
    int sampleRate,
    float frequencyHz,
    float lowPassCutoff,
    float highPassCutoff,
    int sampleCount) {
  FilterState state{0.0f, 0.0f, 0.0f};
  float peak = 0.0f;
  for (int i = 0; i < sampleCount; ++i) {
    const float t = static_cast<float>(i) / static_cast<float>(sampleRate);
    const float sample = std::sin(kPi * 2.0f * frequencyHz * t);
    const float out = apply_filters(sample, state, lowPassCutoff, highPassCutoff, sampleRate);
    peak = std::max(peak, std::abs(out));
  }
  return peak;
}

float pcm_rms(const std::vector<float>& pcm) {
  if (pcm.empty()) {
    return 0.0f;
  }
  double sum_sq = 0.0;
  for (float sample : pcm) {
    sum_sq += static_cast<double>(sample) * static_cast<double>(sample);
  }
  return static_cast<float>(std::sqrt(sum_sq / static_cast<double>(pcm.size())));
}

SfxPatch make_sample_rate_test_patch() {
  SfxPatch patch;
  patch.waveform = SfxWaveform::Sine;
  patch.baseFrequency = 440.0f;
  patch.attack = 0.0f;
  patch.sustain = 0.05f;
  patch.decay = 0.05f;
  patch.frequencySlide = 0.0f;
  patch.frequencyDeltaSlide = 0.0f;
  patch.vibratoDepth = 0.0f;
  patch.vibratoSpeed = 0.0f;
  patch.dutySweep = 0.0f;
  patch.repeatSpeed = 0.0f;
  patch.lowPassCutoff = 1.0f;
  patch.lowPassSweep = 0.0f;
  patch.highPassCutoff = 0.0f;
  patch.highPassSweep = 0.0f;
  patch.phaserOffset = 0.0f;
  patch.phaserSweep = 0.0f;
  patch.masterVolume = 0.5f;
  return patch;
}

double pcm_duration_sec(const std::vector<float>& pcm, int sampleRate) {
  return static_cast<double>(pcm.size()) / static_cast<double>(sampleRate);
}

float estimate_frequency_zero_crossings(
    const std::vector<float>& pcm,
    int sampleRate,
    int start,
    int end) {
  if (start < 1) {
    start = 1;
  }
  if (end > static_cast<int>(pcm.size())) {
    end = static_cast<int>(pcm.size());
  }

  std::vector<float> crossings;
  crossings.reserve(static_cast<std::size_t>(end - start));

  for (int i = start; i < end; ++i) {
    const float prev = pcm[static_cast<std::size_t>(i - 1)];
    const float curr = pcm[static_cast<std::size_t>(i)];
    if (prev <= 0.0f && curr > 0.0f) {
      const float denom = prev - curr;
      const float frac = denom != 0.0f ? prev / denom : 0.0f;
      crossings.push_back(static_cast<float>(i - 1) + frac);
    }
  }

  if (crossings.size() < 2) {
    return 0.0f;
  }

  double interval_sum = 0.0;
  for (std::size_t i = 1; i < crossings.size(); ++i) {
    interval_sum += crossings[i] - crossings[i - 1];
  }

  const float avg_period = static_cast<float>(interval_sum / static_cast<double>(crossings.size() - 1));
  if (avg_period <= 0.0f) {
    return 0.0f;
  }

  return static_cast<float>(sampleRate) / avg_period;
}

bool pcm_equal(const std::vector<float>& a, const std::vector<float>& b) {
  if (a.size() != b.size()) {
    return false;
  }
  for (std::size_t i = 0; i < a.size(); ++i) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}

std::uint32_t fnv1a_pcm_hash(const std::vector<float>& pcm) {
  std::uint32_t hash = 2166136261u;
  for (float sample : pcm) {
    std::uint32_t bits = 0;
    std::memcpy(&bits, &sample, sizeof(bits));
    hash ^= bits;
    hash *= 16777619u;
  }
  hash ^= static_cast<std::uint32_t>(pcm.size());
  hash *= 16777619u;
  return hash;
}

SfxPatch make_golden_patch() {
  SfxPatch patch;
  patch.waveform = SfxWaveform::Noise;
  patch.baseFrequency = 440.0f;
  patch.attack = 0.0f;
  patch.sustain = 0.05f;
  patch.decay = 0.05f;
  patch.masterVolume = 0.5f;
  patch.lowPassCutoff = 1.0f;
  patch.highPassCutoff = 0.0f;
  return patch;
}

}  // namespace

int main() {
  SfxPatch patch;
  patch.attack = 0.0f;
  patch.sustain = 0.1f;
  patch.decay = 0.1f;

  const auto a = render(patch, 44100, 1);
  const auto b = render(patch, 44100, 1);
  CHECK(a.size() == b.size());
  CHECK(a.size() > 0);
  CHECK(a == b);

  const auto at_48k = render(patch, 48000, 1);
  const double duration_44k = static_cast<double>(a.size()) / 44100.0;
  const double duration_48k = static_cast<double>(at_48k.size()) / 48000.0;
  CHECK(std::abs(duration_44k - duration_48k) < 0.002);

  const auto invalid = render(patch, 0, 1);
  CHECK(invalid.empty());

  float packed[SFX_PACKED_FLOAT_COUNT];
  pack_patch(patch, packed);
  const SfxPatch unpacked = unpack_patch(packed);
  CHECK(unpacked.version == patch.version);
  CHECK(unpacked.waveform == patch.waveform);
  CHECK(std::abs(unpacked.sustain - patch.sustain) < 1e-6f);

  {
    SfxRng rng_a(12345);
    SfxRng rng_b(12345);
    for (int i = 0; i < 16; ++i) {
      CHECK(rng_a.next_u32() == rng_b.next_u32());
    }
  }

  {
    SfxRng rng_a(12345);
    SfxRng rng_b(12345);
    for (int i = 0; i < 16; ++i) {
      CHECK(rng_a.next_float() == rng_b.next_float());
    }
  }

  {
    SfxRng rng_a(1);
    SfxRng rng_b(2);
    bool all_equal = true;
    for (int i = 0; i < 16; ++i) {
      if (rng_a.next_u32() != rng_b.next_u32()) {
        all_equal = false;
        break;
      }
    }
    CHECK(!all_equal);
  }

  {
    SfxRng zero_seed(0);
    SfxRng one_seed(1);
    for (int i = 0; i < 16; ++i) {
      CHECK(zero_seed.next_u32() == one_seed.next_u32());
    }
  }

  {
    SfxRng rng(99);
    for (int i = 0; i < 32; ++i) {
      const float value = rng.next_float();
      CHECK(value >= 0.0f);
      CHECK(value < 1.0f);
    }
  }

  {
    SfxRng rng(1);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Square, 0.0f, 0.5f, rng) - 0.5f) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Square, 0.75f, 0.5f, rng) + 0.5f) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Square, 1.0f, 0.5f, rng) - 0.5f) < 1e-6f);
  }

  {
    SfxRng rng(1);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Saw, 0.0f, 0.5f, rng) + 1.0f) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Saw, 0.25f, 0.5f, rng)) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Saw, 0.5f, 0.5f, rng) - 1.0f) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Saw, 0.75f, 0.5f, rng)) < 1e-6f);
  }

  {
    SfxRng rng(1);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Sine, 0.0f, 0.5f, rng)) < 1e-5f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Sine, 0.25f, 0.5f, rng) - 1.0f) < 1e-5f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Sine, 1.0f, 0.5f, rng)) < 1e-5f);
  }

  {
    SfxRng rng(1);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Triangle, 0.0f, 0.5f, rng) + 1.0f) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Triangle, 0.25f, 0.5f, rng)) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Triangle, 0.5f, 0.5f, rng) - 1.0f) < 1e-6f);
    CHECK(std::abs(oscillator_sample(SfxWaveform::Triangle, 0.75f, 0.5f, rng)) < 1e-6f);
  }

  {
    SfxRng rng_a(4242);
    SfxRng rng_b(4242);
    for (int i = 0; i < 8; ++i) {
      const float sample = noise_sample(rng_a);
      CHECK(sample >= -1.0f);
      CHECK(sample <= 1.0f);
      CHECK(sample == noise_sample(rng_b));
    }
    CHECK(oscillator_sample(SfxWaveform::Noise, 0.0f, 0.5f, rng_a) == noise_sample(rng_b));
  }

  {
    const float attack = 0.1f;
    const float sustain = 0.2f;
    const float decay = 0.1f;

    CHECK(envelope_gain(-0.01f, attack, sustain, decay) == 0.0f);
    CHECK(std::abs(envelope_gain(0.0f, attack, sustain, decay)) < 1e-6f);
    CHECK(std::abs(envelope_gain(0.05f, attack, sustain, decay) - 0.5f) < 1e-6f);
    CHECK(std::abs(envelope_gain(0.1f, attack, sustain, decay) - 1.0f) < 1e-6f);
    CHECK(std::abs(envelope_gain(0.25f, attack, sustain, decay) - 1.0f) < 1e-6f);
    CHECK(std::abs(envelope_gain(0.35f, attack, sustain, decay) - 0.5f) < 1e-6f);
    CHECK(envelope_gain(0.4f, attack, sustain, decay) == 0.0f);
    CHECK(envelope_gain(1.0f, attack, sustain, decay) == 0.0f);
  }

  {
    CHECK(envelope_gain(0.0f, 0.0f, 0.0f, 0.0f) == 0.0f);
    CHECK(std::abs(envelope_gain(0.0f, 0.0f, 0.1f, 0.1f) - 1.0f) < 1e-6f);
    CHECK(std::abs(envelope_gain(0.0f, 0.0f, 0.0f, 0.2f) - 1.0f) < 1e-6f);
    CHECK(std::abs(envelope_gain(0.1f, 0.0f, 0.0f, 0.2f) - 0.5f) < 1e-6f);
  }

  {
    const float attack = 0.1f;
    const float sustain = 0.1f;
    const float decay = 0.1f;
    const float t = 0.15f;
    const float gain_from_44k = envelope_gain(6615.0f / 44100.0f, attack, sustain, decay);
    const float gain_from_48k = envelope_gain(7200.0f / 48000.0f, attack, sustain, decay);
    CHECK(std::abs(gain_from_44k - gain_from_48k) < 1e-6f);
    CHECK(std::abs(gain_from_44k - envelope_gain(t, attack, sustain, decay)) < 1e-6f);
  }

  {
    const float base = 440.0f;
    CHECK(std::abs(frequency_at_time(0.0f, base, 0.0f, 0.0f) - base) < 1e-3f);
    CHECK(std::abs(frequency_at_time(1.0f, base, 0.0f, 0.0f) - base) < 1e-3f);
    CHECK(std::abs(frequency_at_time(1.0f, base, 1.0f, 0.0f) - 880.0f) < 1e-3f);
    CHECK(std::abs(frequency_at_time(2.0f, base, 0.0f, 1.0f) - 1760.0f) < 1e-3f);
  }

  {
    const float t = 0.5f;
    const float base = 1000.0f;
    const float slide = 2.0f;
    const float delta = 0.5f;
    const float direct = frequency_at_time(t, base, slide, delta);
    const float from_44k = frequency_at_time(22050.0f / 44100.0f, base, slide, delta);
    const float from_48k = frequency_at_time(24000.0f / 48000.0f, base, slide, delta);
    CHECK(std::abs(from_44k - from_48k) < 1e-3f);
    CHECK(std::abs(direct - from_44k) < 1e-3f);
  }

  {
    const float f = 440.0f;
    CHECK(std::abs(apply_vibrato(f, 0.5f, 0.0f, 5.0f) - f) < 1e-3f);
    CHECK(std::abs(apply_vibrato(f, 0.5f, 0.5f, 0.0f) - f) < 1e-3f);
  }

  {
    const float f = 1000.0f;
    const float depth = 0.5f;
    const float speed = 4.0f;
    const float at_zero = apply_vibrato(f, 0.0f, depth, speed);
    const float at_quarter = apply_vibrato(f, 1.0f / (4.0f * speed), depth, speed);
    CHECK(std::abs(at_zero - f) < 1e-3f);
    CHECK(std::abs(at_quarter - f * (1.0f + depth)) < 1e-2f);
    CHECK(std::abs(at_zero - at_quarter) > 1e-3f);
  }

  {
    const float t = 0.25f;
    const float base = 440.0f;
    const float slide = 1.0f;
    const float depth = 0.3f;
    const float speed = 2.0f;
    const float f = frequency_at_time(t, base, slide, 0.0f);
    const float direct = apply_vibrato(f, t, depth, speed);
    const float from_44k = apply_vibrato(
        frequency_at_time(11025.0f / 44100.0f, base, slide, 0.0f),
        11025.0f / 44100.0f,
        depth,
        speed);
    const float from_48k = apply_vibrato(
        frequency_at_time(12000.0f / 48000.0f, base, slide, 0.0f),
        12000.0f / 48000.0f,
        depth,
        speed);
    CHECK(std::abs(from_44k - from_48k) < 1e-3f);
    CHECK(std::abs(direct - from_44k) < 1e-3f);
  }

  {
    CHECK(std::abs(duty_at_time(0.0f, 0.5f, 0.0f) - 0.5f) < 1e-6f);
    CHECK(std::abs(duty_at_time(1.0f, 0.5f, 0.0f) - 0.5f) < 1e-6f);
    CHECK(std::abs(duty_at_time(0.0f, 0.2f, 0.5f) - 0.2f) < 1e-6f);
    CHECK(std::abs(duty_at_time(1.0f, 0.2f, 0.5f) - 0.7f) < 1e-6f);
    CHECK(std::abs(duty_at_time(1.0f, 0.8f, -0.3f) - 0.5f) < 1e-6f);
  }

  {
    const float high = duty_at_time(10.0f, 0.5f, 1.0f);
    const float low = duty_at_time(10.0f, 0.5f, -1.0f);
    CHECK(std::abs(high - 0.99f) < 1e-6f);
    CHECK(std::abs(low - 0.01f) < 1e-6f);
    CHECK(std::isfinite(high));
    CHECK(std::isfinite(low));

    SfxRng rng(1);
    CHECK(std::isfinite(oscillator_sample(SfxWaveform::Saw, 0.25f, high, rng)));
    CHECK(std::isfinite(oscillator_sample(SfxWaveform::Saw, 0.25f, low, rng)));
  }

  {
    CHECK(std::abs(repeat_local_time(1.5f, 0.0f) - 1.5f) < 1e-6f);
    CHECK(std::abs(repeat_local_time(0.0f, 2.0f) - repeat_local_time(0.5f, 2.0f)) < 1e-6f);
    CHECK(std::abs(repeat_local_time(0.25f, 2.0f) - 0.25f) < 1e-6f);
    CHECK(std::abs(repeat_local_time(0.75f, 2.0f) - 0.25f) < 1e-6f);
  }

  {
    FilterState state{0.0f, 0.0f, 0.0f};
    CHECK(std::abs(apply_filters(0.5f, state, 1.0f, 0.0f, 48000) - 0.5f) < 0.05f);

    const int sampleRate = 48000;
    const int samples = sampleRate / 20;
    const float open = filter_sine_peak(sampleRate, 440.0f, 1.0f, 0.0f, samples);
    const float lp_cut = filter_sine_peak(sampleRate, 4000.0f, 0.05f, 0.0f, samples);
    const float hp_cut = filter_sine_peak(sampleRate, 40.0f, 1.0f, 0.05f, samples);
    CHECK(open > 0.5f);
    CHECK(lp_cut < open * 0.8f);
    CHECK(hp_cut < open * 0.8f);

    const float open_44k = filter_sine_peak(44100, 440.0f, 1.0f, 0.0f, 44100 / 20);
    const float open_48k = filter_sine_peak(48000, 440.0f, 1.0f, 0.0f, 48000 / 20);
    CHECK(std::abs(open_44k - open_48k) < 0.15f);
  }

  {
    PhaserState dry{};
    CHECK(std::abs(apply_phaser(0.75f, dry, 0.0f, 0.0f, 48000) - 0.75f) < 1e-6f);

    PhaserState steady{};
    for (int i = 0; i < 48000; ++i) {
      apply_phaser(std::sin(kPi * 2.0f * static_cast<float>(i) / 480.0f), steady, 0.0f, 0.0f, 48000);
    }
    const float dry_sine = apply_phaser(0.5f, steady, 0.0f, 0.0f, 48000);
    CHECK(std::abs(dry_sine - 0.5f) < 0.05f);
  }

  {
    PhaserState state{};
    const float impulse = apply_phaser(1.0f, state, 0.5f, 0.0f, 48000);
    CHECK(std::abs(impulse - 1.0f) < 1e-6f);

    float delayed_peak = 0.0f;
    for (int i = 0; i < 600; ++i) {
      delayed_peak = std::max(delayed_peak, std::abs(apply_phaser(0.0f, state, 0.5f, 0.0f, 48000)));
    }
    CHECK(delayed_peak > 0.05f);

    const int delay_44k = static_cast<int>(std::floor(0.25f * 0.01f * 44100.0f));
    const int delay_48k = static_cast<int>(std::floor(0.25f * 0.01f * 48000.0f));
    CHECK(std::abs(delay_44k - 110) <= 1);
    CHECK(std::abs(delay_48k - 120) <= 1);
  }

  {
    SfxPatch sine_patch;
    sine_patch.waveform = SfxWaveform::Sine;
    sine_patch.baseFrequency = 440.0f;
    sine_patch.attack = 0.0f;
    sine_patch.sustain = 0.1f;
    sine_patch.decay = 0.1f;
    sine_patch.masterVolume = 0.5f;

    const auto pcm = render(sine_patch, 48000, 7);
    CHECK(!pcm.empty());
    const float rms = pcm_rms(pcm);
    CHECK(rms > 0.05f);
    CHECK(rms < 0.45f);

    bool any_nonzero = false;
    for (float sample : pcm) {
      if (std::abs(sample) > 1e-5f) {
        any_nonzero = true;
        break;
      }
    }
    CHECK(any_nonzero);
  }

  {
    const SfxPatch patch = make_sample_rate_test_patch();
    const auto pcm_44k = render(patch, 44100, 99);
    const auto pcm_48k = render(patch, 48000, 99);
    const auto pcm_22k = render(patch, 22050, 99);

    const double duration_44k = pcm_duration_sec(pcm_44k, 44100);
    const double duration_48k = pcm_duration_sec(pcm_48k, 48000);
    const double duration_22k = pcm_duration_sec(pcm_22k, 22050);

    CHECK(std::abs(duration_44k - duration_48k) < 0.002);
    CHECK(std::abs(duration_44k - duration_22k) < 0.002);
    CHECK(std::abs(duration_48k - duration_22k) < 0.002);

    const float freq_44k = estimate_frequency_zero_crossings(
        pcm_44k,
        44100,
        static_cast<int>(0.01 * 44100.0),
        static_cast<int>(0.04 * 44100.0));
    const float freq_48k = estimate_frequency_zero_crossings(
        pcm_48k,
        48000,
        static_cast<int>(0.01 * 48000.0),
        static_cast<int>(0.04 * 48000.0));

    CHECK(freq_44k > 0.0f);
    CHECK(freq_48k > 0.0f);
    CHECK(std::abs(freq_44k - 440.0f) / 440.0f < 0.02f);
    CHECK(std::abs(freq_48k - 440.0f) / 440.0f < 0.02f);
  }

  {
    const SfxPatch patch = make_golden_patch();
    const auto first = render(patch, 48000, 12345);
    const auto second = render(patch, 48000, 12345);
    CHECK(pcm_equal(first, second));
    CHECK(fnv1a_pcm_hash(first) == fnv1a_pcm_hash(second));

    constexpr int kSnapshotCount = 16;
    CHECK(static_cast<int>(first.size()) >= kSnapshotCount);
    for (int i = 0; i < kSnapshotCount; ++i) {
      CHECK(first[static_cast<std::size_t>(i)] == second[static_cast<std::size_t>(i)]);
    }

    const auto other_seed = render(patch, 48000, 54321);
    CHECK(!pcm_equal(first, other_seed));
    CHECK(fnv1a_pcm_hash(first) != fnv1a_pcm_hash(other_seed));
  }

  if (failures != 0) {
    std::cerr << failures << " check(s) failed\n";
    return 1;
  }
  std::cout << "core tests ok\n";
  return 0;
}
