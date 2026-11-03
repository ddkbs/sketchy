import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { mountScene, type Host } from "./scene-view.js";
import { mountModelPicker, type ModelPickerData } from "./model-picker.js";
import "./styles.css";

const SCENE_META_KEY = "sketchy/scene";
const root = document.getElementById("app")!;
const app = new App({ name: "Sketchy", version: "0.1.8" }, {}, { autoResize: true });

const host: Host = {
  openLink(url) {
    void app.openLink({ url });
  },
  async download(file) {
    const { name, mimeType, text, base64 } = file;
    const frame = root.querySelector<HTMLElement>(".frame") ?? root;
    if (app.getHostCapabilities()?.downloadFile) {
      const resource =
        text !== undefined
          ? { uri: `file:///${name}`, mimeType, text }
          : { uri: `file:///${name}`, mimeType, blob: base64! };
      // isError means the user declined or cancelled the download.
      const done = await app
        .downloadFile({ contents: [{ type: "resource", resource }] })
        .then(() => true)
        .catch(() => false);
      if (done) return;
    }
    // Hosts like Claude offer no downloads, and their sandbox blocks <a download>;
    // a local server writes the file to disk instead.
    // The server may wait for the user in a save dialog.
    const saved = await app
      .callServerTool(
        { name: "save_export", arguments: { name, text, base64 } },
        { timeout: 10 * 60 * 1000 },
      )
      .catch(() => undefined);
    const result = saved?.structuredContent as { path?: string; cancelled?: boolean } | undefined;
    if (result?.cancelled) return;
    const path = result?.path;
    notice(
      frame,
      saved && !saved.isError && path ? `Saved to ${path}` : "Export is not available here.",
    );
  },
  async ask({ text, image }) {
    const caps = app.getHostCapabilities();
    const content: (
      { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
    )[] = [{ type: "text", text }];
    if (image && caps?.message?.image)
      content.push({ type: "image", data: image, mimeType: "image/png" });
    else if (image && caps?.updateModelContext?.image) {
      // The host takes images only as context; it arrives with the message.
      await app
        .updateModelContext({ content: [{ type: "image", data: image, mimeType: "image/png" }] })
        .catch(() => undefined);
    }
    const result = await app.sendMessage({ role: "user", content }).catch(() => undefined);
    return Boolean(result && !result.isError);
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
      ask: app.getHostCapabilities()?.message ? host.ask : undefined,
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

function notice(container: HTMLElement, text: string): void {
  container.querySelector(".notice")?.remove();
  const n = document.createElement("div");
  n.className = "notice";
  n.textContent = text;
  container.appendChild(n);
  setTimeout(() => n.remove(), 5000);
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
