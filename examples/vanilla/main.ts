import { createSfxEngine, defaultPatch } from "../../src/index.ts";

const app = document.querySelector("#app");
if (!app) {
  throw new Error("#app not found");
}

app.innerHTML = `
  <h1>procedural SFX smoke</h1>
  <p>現在のコアはエンベロープ長の無音を返します。T130 以降で実音になります。</p>
  <button type="button" id="play">Play ui.select</button>
  <pre id="log"></pre>
`;

const log = document.querySelector("#log");
const button = document.querySelector("#play");
if (!(button instanceof HTMLButtonElement) || !(log instanceof HTMLPreElement)) {
  throw new Error("smoke UI nodes missing");
}

const sfx = await createSfxEngine({
  presets: {
    "ui.select": defaultPatch({ waveform: "sine", sustain: 0.05, decay: 0.1 }),
  },
});

button.addEventListener("click", () => {
  void (async () => {
    await sfx.play("ui.select");
    const pcm = await sfx.render("ui.select", { seed: 1 });
    log.textContent = `frames=${pcm.length}`;
  })();
});
