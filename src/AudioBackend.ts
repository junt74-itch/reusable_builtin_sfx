export class AudioBackend {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private disposed = false;

  constructor(context: AudioContext) {
    this.context = context;
    this.master = context.createGain();
    this.master.connect(context.destination);
  }

  get sampleRate(): number {
    return this.context.sampleRate;
  }

  setMasterVolume(volume: number): void {
    this.assertOpen();
    this.master.gain.value = Math.max(0, Math.min(1, volume));
  }

  async resume(): Promise<void> {
    this.assertOpen();
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  play(pcm: Float32Array, sampleRate: number, volume = 1, pan = 0): void {
    this.assertOpen();
    if (pcm.length === 0 || sampleRate <= 0) {
      return;
    }

    const clampedVolume = Math.max(0, volume);
    const clampedPan = Math.max(-1, Math.min(1, pan));

    const buffer = this.context.createBuffer(1, pcm.length, sampleRate);
    buffer.getChannelData(0).set(pcm);

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.value = clampedVolume;

    const panner = this.context.createStereoPanner();
    panner.pan.value = clampedPan;

    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.master);
    source.start();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.master.disconnect();
    void this.context.close();
  }

  private assertOpen(): void {
    if (this.disposed) {
      throw new Error("AudioBackend is disposed");
    }
  }
}
