import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { mountScene } from "./scene-view.js";
import "./styles.css";

// Standalone page: the laid-out scene is embedded in the HTML, so the drawing
// works in any browser or HTML preview without an MCP host.
const root = document.getElementById("app")!;
const scene = JSON.parse(
  document.getElementById("sketchy-scene")!.textContent!,
) as LaidOutScene | null;

if (scene) {
  mountScene(root, scene, {
    openLink(url) {
      window.open(url, "_blank", "noopener");
    },
    async download({ name, mimeType, text, base64 }) {
      const blob =
        text !== undefined
          ? new Blob([text], { type: mimeType })
          : new Blob([Uint8Array.from(atob(base64!), (c) => c.charCodeAt(0))], { type: mimeType });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
  });
} else {
  root.textContent = "No drawing embedded.";
}
