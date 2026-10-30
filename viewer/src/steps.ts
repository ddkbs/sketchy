import type { LaidOutScene, Rect } from "../../src/scene/laid-out.js";
import { opts, roundedPath } from "./draw.js";
import { HIGHLIGHT } from "./palette.js";
import type { RenderedScene } from "./render.js";

/**
 * Applies one step: elements that matter stay sharp and get circled in red
 * pen, everything else fades. `undefined` shows the whole scene.
 */
export function applyStep(
  scene: LaidOutScene,
  rendered: RenderedScene,
  index: number | undefined,
): void {
  const { elements, overlay, pen } = rendered;
  overlay.replaceChildren();
  if (index === undefined) {
    elements.forEach((g) => g.classList.remove("dim"));
    return;
  }
  const step = scene.steps[index];
  if (!step) return;
  const active = activeIds(scene, step.highlight);
  elements.forEach((g, id) => g.classList.toggle("dim", !active.has(id)));

  const explicit = new Set(step.highlight);
  const pad = 7;
  const circle = (id: string, r: Rect) =>
    overlay.appendChild(
      pen.rc.rectangle(
        r.x - pad,
        r.y - pad,
        r.width + pad * 2,
        r.height + pad * 2,
        opts(pen, `hl-${id}-${index}`, {
          stroke: HIGHLIGHT,
          strokeWidth: 2.4,
          roughness: 1.6,
          bowing: 2,
        }),
      ),
    );
  for (const n of scene.nodes) if (explicit.has(n.id)) circle(n.id, n);
  for (const p of scene.parts) if (explicit.has(p.id)) circle(p.id, p);
  for (const i of scene.images) if (explicit.has(i.id)) circle(i.id, i);
  for (const g of scene.groups) if (explicit.has(g.id)) circle(g.id, g);
  for (const e of [...scene.edges, ...scene.wires]) {
    if (!active.has(e.id) || e.points.length < 2) continue;
    overlay.appendChild(
      pen.rc.path(
        roundedPath(e.points),
        opts(pen, `hl-${e.id}-${index}`, {
          stroke: HIGHLIGHT,
          strokeWidth: 2.6,
          roughness: 0.9,
        }),
      ),
    );
  }
}

/**
 * Explicit ids plus what belongs to them: edges between two highlighted
 * elements, labels on highlighted targets, and enclosing groups.
 */
export function activeIds(scene: LaidOutScene, highlight: string[]): Set<string> {
  const active = new Set(highlight);
  for (const e of scene.edges) if (active.has(e.from) && active.has(e.to)) active.add(e.id);
  for (const w of scene.wires)
    if (active.has(w.from.part) && active.has(w.to.part)) active.add(w.id);
  for (const e of scene.edges) {
    if (highlight.includes(e.id)) {
      active.add(e.from);
      active.add(e.to);
    }
  }
  for (const l of scene.labels) if (active.has(l.target)) active.add(l.id);
  const parentOf = new Map<string, string | undefined>([
    ...scene.nodes.map((n) => [n.id, n.group] as const),
    ...scene.parts.map((p) => [p.id, p.group] as const),
    ...scene.groups.map((g) => [g.id, g.parent] as const),
  ]);
  for (const id of [...active]) {
    let parent = parentOf.get(id);
    while (parent) {
      active.add(parent);
      parent = parentOf.get(parent);
    }
  }
  return active;
}
