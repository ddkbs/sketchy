import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { mountScene, type Host } from "./scene-view.js";
import { mountModelPicker, type ModelPickerData } from "./model-picker.js";
import "./styles.css";

const SCENE_META_KEY = "sketchy/scene";
const root = document.getElementById("app")!;
const app = new App({ name: "Sketchy", version: "0.1.0" }, {}, { autoResize: true });

const host: Host = {
  openLink(url) {
    void app.openLink({ url });
  },
  async download({ name, mimeType, text, base64 }) {
    const resource =
      text !== undefined
        ? { uri: `file:///${name}`, mimeType, text }
        : { uri: `file:///${name}`, mimeType, blob: base64! };
    const result = await app
      .downloadFile({ contents: [{ type: "resource", resource }] })
      .catch(() => ({ isError: true }));
    if (result.isError) fallbackDownload(name, mimeType, text, base64);
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

function fallbackDownload(name: string, mimeType: string, text?: string, base64?: string): void {
  const href =
    text !== undefined
      ? `data:${mimeType};charset=utf-8,${encodeURIComponent(text)}`
      : `data:${mimeType};base64,${base64}`;
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
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
