#pragma once

// Continuous-time duty for square / saw. sampleRate-independent.
float duty_at_time(float timeSec, float duty0, float dutySweep);
