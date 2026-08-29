#pragma once

// Continuous-time base frequency with octave slide. sampleRate-independent.
float frequency_at_time(
    float timeSec,
    float baseFrequency,
    float frequencySlide,
    float frequencyDeltaSlide);

// Applies vibrato: f'(t) = f(t) * (1 + depth * sin(2π * speed * t)).
float apply_vibrato(float frequencyHz, float timeSec, float vibratoDepth, float vibratoSpeed);
