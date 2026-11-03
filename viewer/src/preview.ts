import type { App } from "@modelcontextprotocol/ext-apps";
import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { mountModelPicker, type ModelPickerData } from "./model-picker.js";
import { mountScene } from "./scene-view.js";
import "./styles.css";

// Development page: renders data laid out by `npm run preview`.
const samples = (await (await fetch("/samples.json")).json()) as Record<
  string,
  LaidOutScene | ModelPickerData
>;
const select = document.getElementById("sample") as HTMLSelectElement;
const root = document.getElementById("app")!;
for (const name of Object.keys(samples)) select.add(new Option(name, name));

// Simulates a download so the picker can be exercised without a server.
let progress = 0;
const fakeApp = {
  async callServerTool({ name }: { name: string }) {
    progress = name === "download_model" ? 0 : Math.min(1, progress + 0.2);
    const state =
      progress >= 1
        ? { state: "ready", tier: "small" }
        : { state: "downloading", tier: "small", progress };
    return { content: [], structuredContent: state };
  },
  async sendMessage(message: unknown) {
    console.log("message", message);
    return {};
  },
} as unknown as App;

const show = () => {
  const data = samples[select.value]!;
  if (data.kind === "model-picker") return mountModelPicker(root, data, fakeApp);
  mountScene(root, data, {
    openLink: (url) => console.log("open", url),
    download: async (file) => console.log("download", file.name),
    ask: async (message) => {
      console.log("ask", message.text, message.image ? `+ image (${message.image.length})` : "");
      return true;
    },
  });
};
select.onchange = show;
select.value = new URLSearchParams(location.search).get("sample") ?? select.value;
show();
