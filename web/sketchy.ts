import { z } from "zod";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { parseCompact } from "../src/scene/compact.js";
import { fillScene, type SketchInput } from "../src/scene/fill.js";
import { sketchShape } from "../src/tools/schemas.js";
import { FONT_CSS } from "../viewer/src/fonts.js";
import { mountScene } from "../viewer/src/scene-view.js";
import styles from "../viewer/src/styles.css?inline";
import { preloaded, wasm } from "./shims/module.js";

// Browser build: lays out and draws a scene on any page, for example an inline
// widget in the Claude chat that loads this file from a CDN.
declare const __ICON_VERSIONS__: Record<string, string>;
declare const __SQLJS_VERSION__: string;

const NPM = "https://cdn.jsdelivr.net/npm";
// Data files (the part catalog) sit next to this script.
const base = new URL(
  ".",
  (document.currentScript as HTMLScriptElement | null)?.src ?? location.href,
);
wasm.url = `${NPM}/sql.js@${__SQLJS_VERSION__}/dist/sql-wasm.wasm`;

let partsPromise: Promise<PartIndex> | undefined;

async function loadIcons(names: string[]): Promise<void> {
  const prefixes = new Set(names.map((n) => (n.includes(":") ? n.split(":")[0]! : "lucide")));
  await Promise.all(
    [...prefixes].map(async (prefix) => {
      const version = __ICON_VERSIONS__[prefix];
      const key = `@iconify-json/${prefix}/icons.json`;
      if (!version || preloaded.has(key)) return;
      const response = await fetch(`${NPM}/@iconify-json/${prefix}@${version}/icons.json`);
      if (response.ok) preloaded.set(key, await response.json());
    }),
  );
}

function loadParts(): Promise<PartIndex> {
  partsPromise ??= fetch(new URL("parts.json", base))
    .then((r) => r.json())
    .then((catalog) => PartIndex.fromCatalog(catalog));
  return partsPromise;
}

/**
 * Scopes the viewer's stylesheet to `.sketchy` so it does not leak into the
 * host page. Button rules also become !important: Claude's widget host styles
 * buttons with a selector that carries ID specificity, which no class can beat.
 */
function scoped(css: string): string {
  const scope = ".sketchy";
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectors: string, body: string) => {
    const list = selectors.split(",").map((sel) => sel.trim());
    const scopedSelectors = list
      .map((sel) => (/^(:root|html|body)$/.test(sel) ? scope : `${scope} ${sel}`))
      .join(", ");
    const important = list.some((sel) => /\bbutton\b/.test(sel))
      ? body
          .split(";")
          .map((d) => (d.trim() && !d.includes("!important") ? `${d} !important` : d))
          .join(";")
      : body;
    return `${scopedSelectors} {${important}}`;
  });
}

function injectStyles(): void {
  if (document.getElementById("sketchy-styles")) return;
  const style = document.createElement("style");
  style.id = "sketchy-styles";
  style.textContent = `${FONT_CSS}\n${scoped(styles)}`;
  document.head.appendChild(style);
}

/** Draws a scene, in the compact line syntax or as JSON, into `target`. */
export async function draw(target: HTMLElement | string, scene: unknown): Promise<void> {
  const root = typeof target === "string" ? document.querySelector<HTMLElement>(target)! : target;
  injectStyles();
  root.classList.add("sketchy");
  try {
    // The line syntax is checked by its parser and carries what the JSON schema
    // leaves out (figures, the values steps assign), so only JSON goes through zod.
    const input: SketchInput =
      typeof scene === "string" ? parseCompact(scene) : z.object(sketchShape).parse(scene);
    const figures = input.figures ?? [];
    const icons = [
      ...(input.nodes ?? []).flatMap((n) => (n.icon ? [n.icon] : [])),
      ...figures.flatMap((f) =>
        f.spec.kind === "draw"
          ? f.spec.shapes.flatMap((s) => (s.geo.g === "icon" ? [s.geo.icon] : []))
          : [],
      ),
    ];
    // Parts need the catalog and SQLite; plain diagrams skip both.
    const [parts] = await Promise.all([
      input.parts?.length ? loadParts() : Promise.resolve(undefined as unknown as PartIndex),
      loadIcons(icons),
    ]);
    const builder = new SceneBuilder(parts);
    await fillScene(builder, input);
    const laidOut = await layoutScene(builder.scene, parts);
    mountScene(root, laidOut, {
      openLink(url) {
        const host = (window as { openLink?: (url: string) => void }).openLink;
        if (host) host(url);
        else window.open(url, "_blank", "noopener");
      },
      // Inline chat widgets run in a sandbox without downloads, so no export buttons.
    });
  } catch (error) {
    root.textContent = `Sketchy could not draw this: ${error instanceof Error ? error.message : String(error)}`;
    throw error;
  }
}
