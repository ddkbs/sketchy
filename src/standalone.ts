import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LaidOutScene } from "./scene/laid-out.js";

/** The viewer as a page of its own, with an empty slot for the scene. */
export const STANDALONE_URL = new URL("../build/standalone.html", import.meta.url);

/** Saves a drawing as a file the user can open; returns its absolute path. */
export type StandaloneSink = (scene: LaidOutScene) => Promise<string>;

const SCENE_SLOT = /(<script type="application\/json" id="sketchy-scene">)[\s\S]*?(<\/script>)/;

/** Puts the scene into the standalone page, so it works offline in any browser. */
export function embedScene(template: string, scene: LaidOutScene): string {
  // "<" is escaped so scene text can never close the script element.
  const json = JSON.stringify(scene).replace(/</g, "\\u003c");
  return template.replace(SCENE_SLOT, (_, open: string, close: string) => `${open}${json}${close}`);
}

/**
 * For clients that cannot show the viewer inline: writes each drawing as an
 * interactive HTML file into `dir`, and opens it in the browser if asked to.
 */
export function standaloneFiles(dir: string, open = false): StandaloneSink {
  return async (scene) => {
    const template = await readFile(STANDALONE_URL, "utf8");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const path = join(dir, `${slug(scene.title?.lines.join(" "))}-${stamp}.html`);
    await writeFile(path, embedScene(template, scene));
    if (open) openInBrowser(path);
    return path;
  };
}

function slug(text: string | undefined): string {
  const s = (text ?? "sketch")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .slice(0, 60);
  return s || "sketch";
}

function openInBrowser(path: string): void {
  // No shell, so the path cannot inject commands.
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [path]]
      : process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", path]]
        : ["xdg-open", [path]];
  execFile(cmd, args, (error) => {
    if (error) console.error(`sketchy: could not open ${path}:`, error.message);
  });
}
