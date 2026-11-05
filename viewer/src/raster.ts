/**
 * Server-side rendering: the viewer's own renderer run against a tiny DOM, so
 * terminals and other image-only surfaces get exactly the drawing the inline
 * viewer shows. Built separately for Node (`vite.raster.config.ts`).
 */
import { DOMParser as LinkedomParser, parseHTML } from "linkedom";
import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { renderScene } from "./render.js";
import { applyStep } from "./steps.js";

const { document } = parseHTML("<!doctype html><html><body></body></html>");
const globals = globalThis as Record<string, unknown>;
globals.document ??= document;
globals.DOMParser ??= LinkedomParser;

/** Dimmed elements as the viewer's stylesheet shows them. */
const RASTER_CSS = ".dim{opacity:.2}.pin{display:none}";

/**
 * The drawing as a standalone SVG string, optionally showing one step.
 * Text uses the font family name only; the rasterizer supplies the font.
 */
export function sceneSvg(scene: LaidOutScene, step?: number): string {
  const rendered = renderScene(scene, RASTER_CSS);
  if (step !== undefined) applyStep(scene, rendered, step);
  return rendered.svg.outerHTML;
}
