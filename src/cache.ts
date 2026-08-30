export function makeCacheKey(name: string, seed: number, sampleRate: number): string {
  return `${name}|${seed >>> 0}|${sampleRate}`;
}

export class PcmCache {
  private readonly entries = new Map<string, Float32Array>();
  private readonly maxEntries: number;

  constructor(maxEntries = 256) {
    this.maxEntries = maxEntries;
  }

  get(key: string): Float32Array | undefined {
    const pcm = this.entries.get(key);
    return pcm ? pcm.slice() : undefined;
  }

  set(key: string, pcm: Float32Array): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
      }
    }
    this.entries.set(key, pcm.slice());
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
