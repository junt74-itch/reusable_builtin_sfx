import {
  BUILTIN_PRESET_NAMES,
  SFX_WAVEFORMS,
  builtinPresets,
  createSfxEngine,
  encodeWavPcm16,
  mutatePatch,
  validatePatch,
  type BuiltinPresetName,
  type SfxPatchV1,
  type SfxWaveform,
} from "../../src/index.ts";

const STORAGE_KEY = "reusable-sfx-authoring-history";
const HISTORY_LIMIT = 50;
const PLAY_DEBOUNCE_MS = 120;

type HistoryEntry = {
  id: string;
  category: BuiltinPresetName;
  seed: number;
  amount: number;
  edited?: boolean;
  favorite: boolean;
  createdAt: number;
  patch: SfxPatchV1;
};

type NumericFieldKey = Exclude<keyof SfxPatchV1, "version" | "waveform">;

type NumericFieldDef = {
  key: NumericFieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
};

const CATEGORY_LABELS: Record<BuiltinPresetName, string> = {
  "ui.select": "UI 選択",
  "ui.cancel": "UI キャンセル",
  "ui.confirm": "UI 決定",
  "item.pickup": "アイテム取得",
  "item.coin": "コイン",
  "player.jump": "ジャンプ",
  "player.damage": "被ダメージ",
  "enemy.hit": "敵ヒット",
  "weapon.shot": "ショット",
  "explosion.basic": "爆発",
  powerup: "パワーアップ",
  warning: "警告",
};

const amountLabels: Record<string, string> = {
  "0.2": "弱",
  "0.45": "中",
  "0.75": "強",
};

const NUMERIC_FIELDS: NumericFieldDef[] = [
  { key: "baseFrequency", label: "基本周波数", unit: "Hz", min: 20, max: 20000, step: 1 },
  { key: "frequencySlide", label: "周波数スライド", unit: "oct/s", min: -8, max: 8, step: 0.01 },
  { key: "frequencyDeltaSlide", label: "スライド変化", unit: "oct/s²", min: -8, max: 8, step: 0.01 },
  { key: "attack", label: "アタック", unit: "s", min: 0, max: 5, step: 0.001 },
  { key: "sustain", label: "サステイン", unit: "s", min: 0, max: 5, step: 0.001 },
  { key: "decay", label: "ディケイ", unit: "s", min: 0, max: 5, step: 0.001 },
  { key: "vibratoDepth", label: "ビブラート深さ", unit: "0..1", min: 0, max: 1, step: 0.01 },
  { key: "vibratoSpeed", label: "ビブラート速度", unit: "Hz", min: 0, max: 100, step: 0.1 },
  { key: "duty", label: "デューティ", unit: "0..1", min: 0, max: 1, step: 0.01 },
  { key: "dutySweep", label: "デューティ変化", unit: "1/s", min: -10, max: 10, step: 0.01 },
  { key: "repeatSpeed", label: "リピート", unit: "1/s", min: 0, max: 20, step: 0.01 },
  { key: "lowPassCutoff", label: "ローパス", unit: "0..1", min: 0, max: 1, step: 0.01 },
  { key: "lowPassSweep", label: "ローパス変化", unit: "1/s", min: -10, max: 10, step: 0.01 },
  { key: "highPassCutoff", label: "ハイパス", unit: "0..1", min: 0, max: 1, step: 0.01 },
  { key: "highPassSweep", label: "ハイパス変化", unit: "1/s", min: -10, max: 10, step: 0.01 },
  { key: "phaserOffset", label: "フェイザー", unit: "0..1", min: 0, max: 1, step: 0.01 },
  { key: "phaserSweep", label: "フェイザー変化", unit: "1/s", min: -10, max: 10, step: 0.01 },
  { key: "masterVolume", label: "音量", unit: "0..1", min: 0, max: 1, step: 0.01 },
];

const categoryEl = document.querySelector("#category");
const categoryHintEl = document.querySelector("#category-hint");
const sampleRateEl = document.querySelector("#sample-rate");
const statusEl = document.querySelector("#status");
const historyEl = document.querySelector("#history");
const drawButton = document.querySelector("#draw");
const playBaseButton = document.querySelector("#play-base");
const clearHistoryButton = document.querySelector("#clear-history");
const editorMetaEl = document.querySelector("#editor-meta");
const editorFieldsEl = document.querySelector("#editor-fields");
const editorActionsEl = document.querySelector("#editor-actions");
const addEditedButton = document.querySelector("#add-edited");
const copyJsonSelectedButton = document.querySelector("#copy-json-selected");
const copyTsSelectedButton = document.querySelector("#copy-ts-selected");
const downloadWavSelectedButton = document.querySelector("#download-wav-selected");
const copyPreviewEl = document.querySelector("#copy-preview");
const copyMetaEl = document.querySelector("#copy-meta");

if (
  !(categoryEl instanceof HTMLSelectElement) ||
  !(categoryHintEl instanceof HTMLElement) ||
  !(sampleRateEl instanceof HTMLElement) ||
  !(statusEl instanceof HTMLElement) ||
  !(historyEl instanceof HTMLUListElement) ||
  !(drawButton instanceof HTMLButtonElement) ||
  !(playBaseButton instanceof HTMLButtonElement) ||
  !(clearHistoryButton instanceof HTMLButtonElement) ||
  !(editorMetaEl instanceof HTMLElement) ||
  !(editorFieldsEl instanceof HTMLElement) ||
  !(editorActionsEl instanceof HTMLElement) ||
  !(addEditedButton instanceof HTMLButtonElement) ||
  !(copyJsonSelectedButton instanceof HTMLButtonElement) ||
  !(copyTsSelectedButton instanceof HTMLButtonElement) ||
  !(downloadWavSelectedButton instanceof HTMLButtonElement) ||
  !(copyPreviewEl instanceof HTMLElement) ||
  !(copyMetaEl instanceof HTMLElement)
) {
  throw new Error("authoring controls not found");
}

const categorySelect = categoryEl;
const categoryHint = categoryHintEl;
const sampleRateLabel = sampleRateEl;
const statusLabel = statusEl;
const historyList = historyEl;
const drawControl = drawButton;
const playBaseControl = playBaseButton;
const clearHistoryControl = clearHistoryButton;
const editorMeta = editorMetaEl;
const editorFields = editorFieldsEl;
const editorActions = editorActionsEl;
const addEditedControl = addEditedButton;
const copyJsonSelectedControl = copyJsonSelectedButton;
const copyTsSelectedControl = copyTsSelectedButton;
const downloadWavSelectedControl = downloadWavSelectedButton;
const copyPreview = copyPreviewEl;
const copyMeta = copyMetaEl;

const waveformSelect = document.createElement("select");
const numericInputs = new Map<NumericFieldKey, HTMLInputElement>();

let playTimer: ReturnType<typeof setTimeout> | undefined;
let suppressEditorEvents = false;
let selectedEntryId: string | null = null;
let selectedCategoryName: BuiltinPresetName | null = null;
let workingPatch: SfxPatchV1 | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBuiltinName(value: string): value is BuiltinPresetName {
  return (BUILTIN_PRESET_NAMES as readonly string[]).includes(value);
}

function categoryLabel(name: BuiltinPresetName): string {
  return CATEGORY_LABELS[name];
}

function categoryOptionLabel(name: BuiltinPresetName): string {
  return `${categoryLabel(name)}（${name}）`;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.id !== "string" || typeof value.category !== "string" || !isBuiltinName(value.category)) {
    return false;
  }
  if (
    typeof value.seed !== "number" ||
    typeof value.amount !== "number" ||
    typeof value.favorite !== "boolean" ||
    typeof value.createdAt !== "number"
  ) {
    return false;
  }
  if (value.edited !== undefined && typeof value.edited !== "boolean") {
    return false;
  }
  try {
    validatePatch(value.patch);
  } catch {
    return false;
  }
  return true;
}

function clonePatch(patch: SfxPatchV1): SfxPatchV1 {
  return validatePatch(structuredClone(patch));
}

function roundNice(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const rounded = Number(value.toPrecision(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function roundPatch(patch: SfxPatchV1): SfxPatchV1 {
  const next: Record<string, unknown> = { ...patch };
  for (const [key, value] of Object.entries(next)) {
    if (typeof value === "number" && key !== "version") {
      next[key] = roundNice(value);
    }
  }
  return validatePatch(next);
}

function formatPlaySnippet(patch: SfxPatchV1): string {
  return `await sfx.play(${JSON.stringify(roundPatch(patch), null, 2)});`;
}

function formatJson(patch: SfxPatchV1): string {
  return `${JSON.stringify(roundPatch(patch), null, 2)}\n`;
}

function patchesEqual(left: SfxPatchV1, right: SfxPatchV1): boolean {
  return JSON.stringify(roundPatch(left)) === JSON.stringify(roundPatch(right));
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isHistoryEntry).map((entry) => ({
      ...entry,
      patch: validatePatch(entry.patch),
    }));
  } catch {
    return [];
  }
}

function trimHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const next = [...entries];
  while (next.length > HISTORY_LIMIT) {
    let dropAt = -1;
    for (let i = next.length - 1; i >= 0; i--) {
      if (!next[i]?.favorite) {
        dropAt = i;
        break;
      }
    }
    if (dropAt === -1) {
      next.pop();
    } else {
      next.splice(dropAt, 1);
    }
  }
  return next;
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimHistory(entries)));
}

function historyForDisplay(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((left, right) => Number(right.favorite) - Number(left.favorite));
}

function selectedCategory(): BuiltinPresetName {
  const value = categorySelect.value;
  if (!isBuiltinName(value)) {
    throw new Error(`unknown category: ${value}`);
  }
  return value;
}

function selectedAmount(): number {
  const checked = document.querySelector('input[name="amount"]:checked');
  if (!(checked instanceof HTMLInputElement)) {
    return 0.45;
  }
  const amount = Number(checked.value);
  return Number.isFinite(amount) ? amount : 0.45;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
}

function formatSeedLabel(entry: HistoryEntry): string {
  return entry.edited ? "edited" : String(entry.seed);
}

function formatAmountLabel(entry: HistoryEntry): string {
  if (entry.edited) {
    return "手編集";
  }
  const amountKey = String(entry.amount);
  return amountLabels[amountKey] ?? amountKey;
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function selectedEntry(): HistoryEntry | undefined {
  return selectedEntryId ? history.find((item) => item.id === selectedEntryId) : undefined;
}

function isDirty(): boolean {
  const entry = selectedEntry();
  if (!entry || !workingPatch) {
    return false;
  }
  return !patchesEqual(entry.patch, workingPatch);
}

function patchForCopy(entry?: HistoryEntry): SfxPatchV1 | null {
  if (entry && entry.id === selectedEntryId && workingPatch) {
    return workingPatch;
  }
  if (workingPatch) {
    return workingPatch;
  }
  return entry?.patch ?? null;
}

function currentCopyPatch(): SfxPatchV1 | null {
  return patchForCopy(selectedEntry());
}

function updateCategoryHint(): void {
  const name = selectedCategory();
  categoryHint.textContent = `${categoryLabel(name)}。ゲームでは sfx.play("${name}") でも鳴らせます。`;
}

function syncCopyPreview(): void {
  const patch = currentCopyPatch();
  const hasPatch = patch !== null;
  copyTsSelectedControl.disabled = !hasPatch;
  copyJsonSelectedControl.disabled = !hasPatch;
  downloadWavSelectedControl.disabled = !hasPatch;

  if (!patch) {
    copyMeta.textContent = "まだありません。カテゴリを選んで引いてください。";
    copyPreview.textContent = `await sfx.play("${selectedCategory()}");`;
    return;
  }

  const entry = selectedEntry();
  const category = selectedCategoryName ?? entry?.category ?? selectedCategory();
  const dirty = isDirty();
  copyMeta.textContent = dirty
    ? `${categoryLabel(category)}（${category}）の未保存の編集。このプレビューがコピーされます。`
    : `${categoryLabel(category)}（${category}）をゲームに貼れます。`;
  copyPreview.textContent = formatPlaySnippet(patch);
}

async function downloadWav(patch: SfxPatchV1, filenameBase: string, seed = 0): Promise<void> {
  const sampleRate = audioContext.sampleRate;
  setStatus("WAV を生成しています...");
  try {
    const pcm = await sfx.render(patch, { sampleRate, seed });
    const wav = encodeWavPcm16(pcm, sampleRate);
    const blob = new Blob([wav], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeFilenamePart(filenameBase)}.wav`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus(`${sanitizeFilenamePart(filenameBase)}.wav を保存しました`);
  } catch {
    setStatus("WAV の生成に失敗しました");
  }
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through to textarea fallback
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) {
    throw new Error("clipboard write failed");
  }
}

function setStatus(message: string): void {
  statusLabel.textContent = message;
}

function readNumericValue(patch: SfxPatchV1, key: NumericFieldKey): number {
  const value = patch[key];
  return typeof value === "number" ? value : 0;
}

function buildEditorControls(): void {
  editorFields.replaceChildren();

  const waveformField = document.createElement("label");
  waveformField.className = "editor-field";
  waveformField.innerHTML = `<span>波形</span>`;
  waveformSelect.id = "waveform";
  for (const waveform of SFX_WAVEFORMS) {
    const option = document.createElement("option");
    option.value = waveform;
    option.textContent = waveform;
    waveformSelect.append(option);
  }
  waveformField.append(waveformSelect);
  editorFields.append(waveformField);

  waveformSelect.addEventListener("change", () => {
    if (suppressEditorEvents || !workingPatch) {
      return;
    }
    workingPatch = validatePatch({
      ...workingPatch,
      waveform: waveformSelect.value as SfxWaveform,
    });
    syncCopyPreview();
    renderHistory(history);
    schedulePlayWorkingPatch("波形");
  });

  for (const field of NUMERIC_FIELDS) {
    const label = document.createElement("label");
    label.className = "editor-field";
    label.innerHTML = `<span>${field.label} <em>(${field.unit})</em></span>`;

    const input = document.createElement("input");
    input.type = "number";
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.dataset.key = field.key;
    numericInputs.set(field.key, input);

    input.addEventListener("input", () => {
      if (suppressEditorEvents || !workingPatch) {
        return;
      }
      const nextValue = Number(input.value);
      if (!Number.isFinite(nextValue)) {
        return;
      }
      workingPatch = validatePatch({
        ...workingPatch,
        [field.key]: nextValue,
      });
      syncCopyPreview();
      renderHistory(history);
      schedulePlayWorkingPatch(field.label);
    });

    label.append(input);
    editorFields.append(label);
  }
}

function syncEditorControls(): void {
  suppressEditorEvents = true;
  if (!workingPatch) {
    editorFields.classList.add("hidden");
    editorActions.classList.add("hidden");
    editorMeta.textContent = "履歴から 1 件選ぶか、引いた直後に編集できます。";
    suppressEditorEvents = false;
    syncCopyPreview();
    return;
  }

  editorFields.classList.remove("hidden");
  editorActions.classList.remove("hidden");
  waveformSelect.value = workingPatch.waveform;
  for (const field of NUMERIC_FIELDS) {
    const input = numericInputs.get(field.key);
    if (input) {
      input.value = String(readNumericValue(workingPatch, field.key));
    }
  }

  const category = selectedCategoryName ?? selectedCategory();
  editorMeta.textContent = `編集中: ${categoryLabel(category)}（${category}）。値を変えると再生され、上のコードも更新されます。`;
  suppressEditorEvents = false;
  syncCopyPreview();
}

function selectEntry(entry: HistoryEntry, play = false): void {
  selectedEntryId = entry.id;
  selectedCategoryName = entry.category;
  workingPatch = clonePatch(entry.patch);
  syncEditorControls();
  renderHistory(history);
  if (play) {
    setStatus(`${categoryLabel(entry.category)} を再生`);
    void playPatch(entry.patch);
  }
}

function clearSelection(): void {
  selectedEntryId = null;
  selectedCategoryName = null;
  workingPatch = null;
  syncEditorControls();
  renderHistory(history);
}

function schedulePlayWorkingPatch(label: string): void {
  if (!workingPatch) {
    return;
  }
  if (playTimer !== undefined) {
    clearTimeout(playTimer);
  }
  playTimer = setTimeout(() => {
    playTimer = undefined;
    if (!workingPatch) {
      return;
    }
    setStatus(`${label} を変更して再生`);
    void playPatch(workingPatch);
  }, PLAY_DEBOUNCE_MS);
}

function renderHistory(entries: HistoryEntry[]): void {
  historyList.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "まだ履歴がありません。カテゴリを選んで引いてください。";
    historyList.append(empty);
    return;
  }

  for (const entry of historyForDisplay(entries)) {
    const item = document.createElement("li");
    item.className = "history-item";
    if (entry.favorite) {
      item.classList.add("favorite");
    }
    if (entry.id === selectedEntryId) {
      item.classList.add("selected");
    }
    item.dataset.id = entry.id;

    const dirty = entry.id === selectedEntryId && isDirty();
    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.innerHTML = `<strong>${categoryLabel(entry.category)}</strong><span>${entry.category}</span><span>${formatAmountLabel(entry)}</span>${dirty ? "<span>未保存の編集</span>" : ""}`;

    const actions = document.createElement("div");
    actions.className = "history-actions";
    actions.innerHTML = `
      <button type="button" data-action="replay">再生</button>
      <button type="button" data-action="copy-ts">コピー</button>
      <button type="button" data-action="favorite">${entry.favorite ? "★ お気に入り" : "☆ お気に入り"}</button>
    `;

    item.append(meta, actions);
    historyList.append(item);
  }
}

const audioContext = new AudioContext();
const sfx = await createSfxEngine({ audioContext });
const presets = builtinPresets();
let history = trimHistory(loadHistory());

buildEditorControls();

for (const name of BUILTIN_PRESET_NAMES) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = categoryOptionLabel(name);
  categorySelect.append(option);
}
categorySelect.value = "ui.select";
sampleRateLabel.textContent = String(audioContext.sampleRate);
updateCategoryHint();
renderHistory(history);
syncEditorControls();

const firstFavorite = history.find((entry) => entry.favorite) ?? history[0];
if (firstFavorite) {
  selectEntry(firstFavorite);
}

async function playPatch(patch: SfxPatchV1): Promise<void> {
  await sfx.play(patch);
}

function drawVariant(): void {
  const category = selectedCategory();
  const amount = selectedAmount();
  const seed = randomSeed();
  const base = presets[category];
  if (!base) {
    throw new Error(`missing preset: ${category}`);
  }
  const patch = mutatePatch(base, { amount, seed });
  const entry: HistoryEntry = {
    id: `${Date.now().toString(36)}-${seed.toString(16)}`,
    category,
    seed,
    amount,
    favorite: false,
    createdAt: Date.now(),
    patch,
  };
  history = trimHistory([entry, ...history]);
  saveHistory(history);
  selectEntry(entry);
  setStatus(`${categoryLabel(category)} を引きました`);
  void playPatch(patch);
}

async function copyCurrent(kind: "ts" | "json"): Promise<void> {
  const patch = currentCopyPatch();
  if (!patch) {
    return;
  }
  const text = kind === "ts" ? `${formatPlaySnippet(patch)}\n` : formatJson(patch);
  try {
    await copyText(text);
    setStatus(kind === "ts" ? "ゲーム用コードをコピーしました" : "JSON をコピーしました");
  } catch {
    setStatus("コピーに失敗しました。ブラウザを前面にして再試行してください");
  }
}

categorySelect.addEventListener("change", () => {
  updateCategoryHint();
  if (!workingPatch) {
    syncCopyPreview();
  }
});

drawControl.addEventListener("click", () => {
  drawVariant();
});

playBaseControl.addEventListener("click", () => {
  const category = selectedCategory();
  setStatus(`${categoryLabel(category)} のベースを再生`);
  void sfx.play(category);
});

clearHistoryControl.addEventListener("click", () => {
  history = history.filter((entry) => entry.favorite);
  saveHistory(history);
  if (selectedEntryId && !history.some((entry) => entry.id === selectedEntryId)) {
    clearSelection();
  } else {
    renderHistory(history);
    syncCopyPreview();
  }
  setStatus(history.length === 0 ? "履歴を消しました" : "お気に入り以外を消しました");
});

addEditedControl.addEventListener("click", () => {
  if (!workingPatch || !selectedCategoryName) {
    setStatus("先に履歴から 1 件選んでください");
    return;
  }
  const patch = clonePatch(workingPatch);
  const entry: HistoryEntry = {
    id: `${Date.now().toString(36)}-edited`,
    category: selectedCategoryName,
    seed: 0,
    amount: 0,
    edited: true,
    favorite: false,
    createdAt: Date.now(),
    patch,
  };
  history = trimHistory([entry, ...history]);
  saveHistory(history);
  selectEntry(entry);
  setStatus(`${categoryLabel(selectedCategoryName)} の手編集を履歴に残しました`);
  void playPatch(patch);
});

copyJsonSelectedControl.addEventListener("click", () => {
  void copyCurrent("json");
});

copyTsSelectedControl.addEventListener("click", () => {
  void copyCurrent("ts");
});

downloadWavSelectedControl.addEventListener("click", () => {
  const patch = currentCopyPatch();
  if (!patch) {
    return;
  }
  const entry = selectedEntry();
  const category = selectedCategoryName ?? entry?.category ?? "patch";
  const label = entry ? `${category}-${formatSeedLabel(entry)}` : `${category}-edited`;
  void downloadWav(patch, label, entry?.edited ? 0 : (entry?.seed ?? 0));
});

historyList.addEventListener("click", (event) => {
  const target = event.target;
  const row = target instanceof HTMLElement ? target.closest("[data-id]") : null;
  if (!(row instanceof HTMLElement)) {
    return;
  }
  const entry = history.find((item) => item.id === row.dataset.id);
  if (!entry) {
    return;
  }

  if (target instanceof HTMLButtonElement) {
    const action = target.dataset.action;

    if (action === "replay") {
      if (entry.id === selectedEntryId && workingPatch) {
        setStatus(`${categoryLabel(entry.category)} を再生`);
        void playPatch(workingPatch);
        return;
      }
      selectEntry(entry, true);
      return;
    }

    if (action === "copy-ts") {
      if (entry.id !== selectedEntryId) {
        selectEntry(entry);
      }
      void copyCurrent("ts");
      return;
    }

    if (action === "favorite") {
      history = history.map((item) =>
        item.id === entry.id ? { ...item, favorite: !item.favorite } : item,
      );
      saveHistory(history);
      renderHistory(history);
      setStatus(entry.favorite ? "お気に入りを外しました" : "お気に入りに追加しました");
    }
    return;
  }

  selectEntry(entry, true);
});

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) {
    return;
  }
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLButtonElement
  ) {
    return;
  }
  event.preventDefault();
  drawVariant();
});

window.addEventListener("beforeunload", () => {
  if (playTimer !== undefined) {
    clearTimeout(playTimer);
  }
  sfx.dispose();
});
