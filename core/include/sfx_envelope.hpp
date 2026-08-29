#pragma once

// ADSR without release. Times are in seconds.
float envelope_gain(float timeSec, float attack, float sustain, float decay);
