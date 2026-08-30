import { describe, expect, test } from "bun:test";
import { encodeWavPcm16 } from "../src/wav.ts";

function readTag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
}

describe("encodeWavPcm16", () => {
  test("produces identical bytes for the same PCM and sampleRate", () => {
    const pcm = new Float32Array([0, 0.25, -0.25, 0.5, -0.5, 1, -1, 1.5, -2]);
    const first = new Uint8Array(encodeWavPcm16(pcm, 48000));
    const second = new Uint8Array(encodeWavPcm16(pcm, 48000));

    expect(Array.from(first)).toEqual(Array.from(second));
  });

  test("includes RIFF / WAVE / fmt / data chunks", () => {
    const pcm = new Float32Array([0, 0.1, -0.1]);
    const bytes = new Uint8Array(encodeWavPcm16(pcm, 44100));

    expect(readTag(bytes, 0)).toBe("RIFF");
    expect(readTag(bytes, 8)).toBe("WAVE");
    expect(readTag(bytes, 12)).toBe("fmt ");
    expect(readTag(bytes, 36)).toBe("data");
    expect(bytes.length).toBe(44 + pcm.length * 2);
  });

  test("writes sampleRate from the argument", () => {
    const pcm = new Float32Array([0]);
    const view44100 = new DataView(encodeWavPcm16(pcm, 44100));
    const view48000 = new DataView(encodeWavPcm16(pcm, 48000));

    expect(view44100.getUint32(24, true)).toBe(44100);
    expect(view48000.getUint32(24, true)).toBe(48000);
  });

  test("clamps samples to 16-bit PCM range", () => {
    const pcm = new Float32Array([2, -2]);
    const view = new DataView(encodeWavPcm16(pcm, 22050));

    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });

  test("rejects non-positive sampleRate", () => {
    expect(() => encodeWavPcm16(new Float32Array([0]), 0)).toThrow("sampleRate");
  });
});
