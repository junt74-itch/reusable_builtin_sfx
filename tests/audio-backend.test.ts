import { describe, expect, test } from "bun:test";
import { AudioBackend } from "../src/AudioBackend.ts";

interface MockNode {
  kind: string;
  connectedTo: MockNode[];
  connect(destination: MockNode): MockNode;
  disconnect(): void;
}

function createMockNode(kind: string): MockNode {
  return {
    kind,
    connectedTo: [],
    connect(destination: MockNode) {
      this.connectedTo.push(destination);
      return destination;
    },
    disconnect() {
      this.connectedTo.length = 0;
    },
  };
}

function createMockAudioContext() {
  const destination = createMockNode("destination");
  const nodes = {
    master: null as MockNode | null,
    gains: [] as MockNode[],
    panners: [] as MockNode[],
    sources: [] as MockNode[],
  };

  const context = {
    state: "suspended" as AudioContextState,
    sampleRate: 48000,
    destination,
    createGain() {
      const node = createMockNode("gain") as MockNode & { gain: { value: number } };
      node.gain = { value: 1 };
      nodes.gains.push(node);
      return node as unknown as GainNode;
    },
    createStereoPanner() {
      const node = createMockNode("panner") as MockNode & { pan: { value: number } };
      node.pan = { value: 0 };
      nodes.panners.push(node);
      return node as unknown as StereoPannerNode;
    },
    createBufferSource() {
      const node = createMockNode("source");
      (node as unknown as { start(): void }).start = () => {};
      nodes.sources.push(node);
      return node as unknown as AudioBufferSourceNode;
    },
    createBuffer(_channels: number, length: number, _sampleRate: number) {
      return {
        length,
        getChannelData: () => new Float32Array(length),
      } as unknown as AudioBuffer;
    },
    async resume() {
      context.state = "running";
    },
    async close() {
      context.state = "closed";
    },
  };

  return { context: context as unknown as AudioContext, nodes, destination };
}

describe("AudioBackend", () => {
  test("connects source -> gain -> panner -> master -> destination", () => {
    const { context, nodes, destination } = createMockAudioContext();
    const backend = new AudioBackend(context);
    const master = nodes.gains[0];
    expect(master).toBeDefined();

    backend.play(new Float32Array([0.25, -0.25, 0.5]), 48000, 0.8, 0.25);

    const playGain = nodes.gains[1];
    const playPanner = nodes.panners[0];
    expect(nodes.sources).toHaveLength(1);
    expect(playGain).toBeDefined();
    expect(playPanner).toBeDefined();
    expect(nodes.sources[0]?.connectedTo[0]).toBe(playGain);
    expect(playGain?.connectedTo[0]).toBe(playPanner);
    expect(playPanner?.connectedTo[0]).toBe(master);
    expect(master?.connectedTo[0]).toBe(destination);

    backend.dispose();
  });

  test("clamps volume and pan", () => {
    const { context, nodes } = createMockAudioContext();
    const backend = new AudioBackend(context);

    backend.play(new Float32Array([0.5, 0.5]), 48000, -2, 3);

    const gain = nodes.gains[1] as unknown as { gain: { value: number } };
    const panner = nodes.panners[0] as unknown as { pan: { value: number } };
    expect(gain.gain.value).toBe(0);
    expect(panner.pan.value).toBe(1);

    backend.dispose();
  });

  test("setMasterVolume clamps to 0..1", () => {
    const { context, nodes } = createMockAudioContext();
    const backend = new AudioBackend(context);
    const master = nodes.gains[0] as unknown as { gain: { value: number } };

    backend.setMasterVolume(-1);
    expect(master.gain.value).toBe(0);

    backend.setMasterVolume(2);
    expect(master.gain.value).toBe(1);

    backend.setMasterVolume(0.75);
    expect(master.gain.value).toBe(0.75);

    backend.dispose();
  });

  test("resume resolves suspended context", async () => {
    const { context } = createMockAudioContext();
    const backend = new AudioBackend(context);

    await backend.resume();
    expect(context.state).toBe("running");

    backend.dispose();
    expect(() => backend.play(new Float32Array([0.1]), 48000)).toThrow("disposed");
  });

  test("dispose is idempotent and blocks playback", () => {
    const { context } = createMockAudioContext();
    const backend = new AudioBackend(context);
    const pcm = new Float32Array([0.1, 0.2]);

    backend.dispose();
    backend.dispose();
    expect(() => backend.play(pcm, 48000)).toThrow("disposed");
  });

  test("does not import patch types", async () => {
    const source = await Bun.file("src/AudioBackend.ts").text();
    expect(source.includes("SfxPatch")).toBe(false);
    expect(source.includes("patch.ts")).toBe(false);
  });
});
