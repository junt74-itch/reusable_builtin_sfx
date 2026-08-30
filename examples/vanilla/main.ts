import { createSfxEngine } from "../../src/index.ts";

const app = document.querySelector("#app");
if (!app) {
  throw new Error("#app not found");
}

const audioContext = new AudioContext();
const sfx = await createSfxEngine({ audioContext });
const sampleRate = audioContext.sampleRate;

app.innerHTML = `
  <h1>Vanilla SFX Demo</h1>
  <p class="meta">sampleRate: <strong id="sample-rate"></strong> Hz</p>
  <p class="hint">ボタンをクリックすると SE が鳴ります（初回クリックで AudioContext が resume されます）。</p>
  <div class="buttons">
    <button type="button" data-preset="ui.select">ui.select</button>
    <button type="button" data-preset="player.jump">player.jump</button>
    <button type="button" data-preset="enemy.hit">enemy.hit</button>
    <button type="button" data-preset="explosion.basic">explosion.basic</button>
    <button type="button" id="random-variant">Random variant</button>
  </div>
`;

const sampleRateEl = document.querySelector("#sample-rate");
if (!(sampleRateEl instanceof HTMLElement)) {
  throw new Error("#sample-rate not found");
}
sampleRateEl.textContent = String(sampleRate);

for (const button of document.querySelectorAll("button[data-preset]")) {
  if (!(button instanceof HTMLButtonElement)) {
    continue;
  }
  const preset = button.dataset.preset;
  if (!preset) {
    continue;
  }
  button.addEventListener("click", () => {
    void sfx.play(preset);
  });
}

const randomButton = document.querySelector("#random-variant");
if (!(randomButton instanceof HTMLButtonElement)) {
  throw new Error("#random-variant not found");
}

randomButton.addEventListener("click", () => {
  const seed = Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
  void sfx.play("ui.select", { seed });
});

window.addEventListener("beforeunload", () => {
  sfx.dispose();
});
