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
    this.master.gain.value = volume;
  }

  async resume(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  play(pcm: Float32Array, sampleRate: number, volume = 1, pan = 0): void {
    this.assertOpen();
    const buffer = this.context.createBuffer(1, Math.max(1, pcm.length), sampleRate);
    const channel = buffer.getChannelData(0);
    channel.set(pcm);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    const panner = this.context.createStereoPanner();
    panner.pan.value = pan;
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
