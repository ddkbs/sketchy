import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { mountScene, type Host } from "./scene-view.js";
import { mountModelPicker, type ModelPickerData } from "./model-picker.js";
import { showSaveSheet } from "./save-sheet.js";
import "./styles.css";

const SCENE_META_KEY = "sketchy/scene";
const root = document.getElementById("app")!;
const app = new App({ name: "Sketchy", version: "0.1.1" }, {}, { autoResize: true });

const host: Host = {
  openLink(url) {
    void app.openLink({ url });
  },
  async download(file) {
    const { name, mimeType, text, base64 } = file;
    const frame = root.querySelector<HTMLElement>(".frame") ?? root;
    // Hosts without downloadFile run the view in a sandbox that also blocks <a download>.
    if (!app.getHostCapabilities()?.downloadFile) return showSaveSheet(frame, file);
    const resource =
      text !== undefined
        ? { uri: `file:///${name}`, mimeType, text }
        : { uri: `file:///${name}`, mimeType, blob: base64! };
    // isError means the user declined or cancelled; only a failed request needs the fallback.
    await app
      .downloadFile({ contents: [{ type: "resource", resource }] })
      .catch(() => showSaveSheet(frame, file));
  },
  toggleFullscreen() {
    const mode = app.getHostContext()?.displayMode === "fullscreen" ? "inline" : "fullscreen";
    void app.requestDisplayMode({ mode });
  },
};

type ViewData = LaidOutScene | ModelPickerData;

async function show(result: CallToolResult): Promise<void> {
  let data = result._meta?.[SCENE_META_KEY] as ViewData | undefined;
  const view = (result.structuredContent as { view?: unknown } | undefined)?.view;
  // Some hosts strip custom _meta; fetch the payload by its id instead.
  if (!data && typeof view === "string") {
    const fetched = await app
      .callServerTool({ name: "get_view", arguments: { view } })
      .catch(() => undefined);
    data = fetched?.isError ? undefined : (fetched?.structuredContent as ViewData | undefined);
    if (!data) {
      message("Sketchy could not load this drawing.");
      return;
    }
  }
  if (data?.kind === "scene") {
    mountScene(root, data, {
      ...host,
      toggleFullscreen: app.getHostContext()?.availableDisplayModes?.includes("fullscreen")
        ? host.toggleFullscreen
        : undefined,
    });
  } else if (data?.kind === "model-picker") {
    mountModelPicker(root, data, app);
  } else if (result.isError) {
    message("Sketchy could not draw this.");
  }
}

function message(text: string): void {
  const p = document.createElement("div");
  p.className = "message";
  p.textContent = text;
  root.replaceChildren(p);
}

function applyContext(): void {
  const ctx = app.getHostContext();
  const dims = ctx?.containerDimensions as { maxHeight?: number } | undefined;
  const fullscreen = ctx?.displayMode === "fullscreen";
  document.documentElement.style.setProperty(
    "--max-height",
    fullscreen ? "calc(100vh - 120px)" : dims?.maxHeight ? `${dims.maxHeight - 90}px` : "none",
  );
}

message("Sketching…");
app.ontoolresult = (result) => void show(result as CallToolResult);
app.onhostcontextchanged = () => applyContext();
await app.connect();
applyContext();
