import type { App } from "@modelcontextprotocol/ext-apps";
import { esc } from "./scene-view.js";

type Tier = "small" | "medium" | "large";

type ModelState =
  | { state: "none" }
  | { state: "downloading"; tier: Tier; progress: number }
  | { state: "ready"; tier: Tier }
  | { state: "error"; tier: Tier; message: string };

export type ModelPickerData = {
  kind: "model-picker";
  models: {
    tier: Tier;
    title: string;
    downloadMb: number;
    ramGb: number;
    speed: string;
    quality: string;
  }[];
  state: ModelState;
};

/** One-time setup view: pick a local vision model and watch it download. */
export function mountModelPicker(root: HTMLElement, data: ModelPickerData, app: App): void {
  root.replaceChildren();
  const frame = document.createElement("div");
  frame.className = "frame picker";
  frame.innerHTML = `
    <h2>Photo labeling model</h2>
    <p class="lead">Sketchy finds parts in photos with a vision model that runs on your computer. Pick a size; you can switch later.</p>
    <div class="cards"></div>
    <div class="status" aria-live="polite"></div>`;
  root.appendChild(frame);
  const cards = frame.querySelector<HTMLDivElement>(".cards")!;
  const status = frame.querySelector<HTMLDivElement>(".status")!;
  let state = data.state;
  let timer: number | undefined;

  const render = () => {
    const busy = state.state === "downloading";
    cards.replaceChildren(
      ...data.models.map((m) => {
        const card = document.createElement("div");
        const active = "tier" in state && state.tier === m.tier;
        card.className = `card${active ? " active" : ""}${m.tier === "small" ? " recommended" : ""}`;
        const size =
          m.downloadMb >= 1000 ? `${(m.downloadMb / 1000).toFixed(1)} GB` : `${m.downloadMb} MB`;
        card.innerHTML = `
          <div class="card-title">${esc(m.title)}${m.tier === "small" ? ' <span class="tag">recommended</span>' : ""}</div>
          <dl>
            <dt>Download</dt><dd>${size}</dd>
            <dt>Memory</dt><dd>${m.ramGb} GB</dd>
            <dt>Speed</dt><dd>${esc(m.speed)}</dd>
          </dl>
          <p>${esc(m.quality)}</p>`;
        const button = document.createElement("button");
        const ready = state.state === "ready" && state.tier === m.tier;
        button.textContent = ready ? "Installed ✓" : active && busy ? "Downloading…" : "Use this";
        button.disabled = busy || ready;
        button.onclick = () => void choose(m.tier);
        card.appendChild(button);
        return card;
      }),
    );
    status.replaceChildren();
    if (state.state === "downloading") {
      const pct = Math.round(state.progress * 100);
      status.innerHTML = `<div class="bar"><div style="width:${pct}%"></div></div><span>Downloading… ${pct} %</span>`;
    } else if (state.state === "ready") {
      status.innerHTML = `<span>Ready. </span>`;
      const go = document.createElement("button");
      go.textContent = "Continue labeling ›";
      go.onclick = () =>
        void app.sendMessage({
          role: "user",
          content: [
            { type: "text", text: "The photo-labeling model is installed. Please continue." },
          ],
        });
      status.appendChild(go);
    } else if (state.state === "error") {
      status.innerHTML = `<span class="error">Download failed: ${esc(state.message)}</span>`;
    }
  };

  const poll = async () => {
    const result = await app.callServerTool({ name: "model_status", arguments: {} });
    state = result.structuredContent as ModelState;
    render();
    if (state.state === "downloading") timer = window.setTimeout(poll, 800);
  };

  const choose = async (tier: Tier) => {
    window.clearTimeout(timer);
    const result = await app.callServerTool({ name: "download_model", arguments: { tier } });
    state = result.structuredContent as ModelState;
    render();
    if (state.state === "downloading") timer = window.setTimeout(poll, 800);
  };

  render();
  if (state.state === "downloading") void poll();
}
