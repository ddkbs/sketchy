import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LaidOutScene } from "./scene/laid-out.js";

/**
 * What the Claude Code plugin needs to draw one result in the terminal: the
 * laid-out scene for its character renderer and, where rendering works, a
 * PNG per state (whole drawing first, then one per step) for terminals that
 * show images. Paths are absolute; the terminal reads the PNGs itself.
 */
export type TerminalFiles = {
  scene: string;
  images: string[];
  width: number;
  height: number;
  /** The interactive HTML page, when one was saved. */
  page?: string;
};

export type TerminalSink = (scene: LaidOutScene) => Promise<TerminalFiles>;

const RASTER_URL = new URL("../build/raster.js", import.meta.url);
const FONTS_URL = new URL("../build/fonts/", import.meta.url);
const FONT_FILES = ["latin-400", "latin-700", "latin-ext-400", "latin-ext-700"];
/** Pixels per scene pixel: crisp on high-density screens, still small files. */
const ZOOM = 2;
/** Drawings kept on disk; older ones are removed as new ones arrive. */
const KEEP = 40;

type Rasterizer = (scene: LaidOutScene, step?: number) => Buffer;

let rasterizer: Promise<Rasterizer | undefined> | undefined;

/** Loads the renderer and resvg once; a missing native build disables images only. */
function loadRasterizer(): Promise<Rasterizer | undefined> {
  rasterizer ??= (async () => {
    try {
      const [{ sceneSvg }, { Resvg }] = await Promise.all([
        import(RASTER_URL.href) as Promise<{
          sceneSvg: (scene: LaidOutScene, step?: number) => string;
        }>,
        import("@resvg/resvg-js"),
      ]);
      const fontFiles = FONT_FILES.map((f) => new URL(`kalam-${f}.ttf`, FONTS_URL).pathname);
      return (scene, step) =>
        new Resvg(sceneSvg(scene, step), {
          font: { fontFiles, loadSystemFonts: true, defaultFontFamily: "Kalam" },
          fitTo: { mode: "zoom", value: ZOOM },
        })
          .render()
          .asPng();
    } catch (error) {
      console.error("sketchy: terminal images disabled, cannot load the renderer:", error);
      return undefined;
    }
  })();
  return rasterizer;
}

/**
 * Writes each drawing for the Claude Code plugin into `dir`. `page` saves the
 * interactive HTML version next to it, for an "open in browser" link.
 */
export function terminalFiles(
  dir: string,
  page?: (scene: LaidOutScene) => Promise<string>,
): TerminalSink {
  return async (scene) => {
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const scenePath = join(dir, `${id}.json`);
    await writeFile(scenePath, JSON.stringify(scene));
    const images: string[] = [];
    const raster = await loadRasterizer();
    if (raster) {
      try {
        const states = [undefined, ...scene.steps.map((_, i) => i)];
        for (const step of states) {
          const path = join(dir, `${id}${step === undefined ? "" : `-step${step + 1}`}.png`);
          await writeFile(path, raster(scene, step));
          images.push(path);
        }
      } catch (error) {
        console.error("sketchy: could not render the terminal image:", error);
        images.length = 0;
      }
    }
    const pagePath = page ? await page(scene).catch(() => undefined) : undefined;
    void prune(dir);
    return {
      scene: scenePath,
      images,
      width: scene.width,
      height: scene.height,
      ...(pagePath ? { page: pagePath } : {}),
    };
  };
}

/** Removes the files of all but the newest drawings. */
async function prune(dir: string): Promise<void> {
  try {
    const names = await readdir(dir);
    const scenes = await Promise.all(
      names
        .filter((n) => n.endsWith(".json"))
        .map(async (n) => ({ id: n.slice(0, -5), time: (await stat(join(dir, n))).mtimeMs })),
    );
    scenes.sort((a, b) => b.time - a.time);
    const stale = new Set(scenes.slice(KEEP).map((s) => s.id));
    if (!stale.size) return;
    await Promise.all(
      names.filter((n) => stale.has(n.slice(0, 36))).map((n) => rm(join(dir, n), { force: true })),
    );
  } catch {
    // Pruning is housekeeping; a failure must not break drawing.
  }
}
