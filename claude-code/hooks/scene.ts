/**
 * Reads the laid-out scene out of a Sketchy tool result and keeps only what
 * the terminal draws, so the stored state stays small.
 */
import type { Rect, Sketch } from "../types";

export type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null;

/** Depth-first search for the first value that passes `test`. */
export function find(value: unknown, test: (v: unknown) => boolean, depth = 0): unknown {
  if (test(value)) return value;
  if (depth > 8) return undefined;
  if (typeof value === "string" && value.startsWith("{")) {
    try {
      return find(JSON.parse(value), test, depth + 1);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = find(v, test, depth + 1);
      if (hit !== undefined) return hit;
    }
  } else if (isObject(value)) {
    for (const v of Object.values(value)) {
      const hit = find(v, test, depth + 1);
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}

export const isScene = (v: unknown) => isObject(v) && v.kind === "scene" && Array.isArray(v.nodes);
export const hasView = (v: unknown) => isObject(v) && typeof v.view === "string";

const rect = (v: Json): Rect => ({
  x: Number(v.x) || 0,
  y: Number(v.y) || 0,
  width: Number(v.width) || 0,
  height: Number(v.height) || 0,
});
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.filter(isObject) : []);
const lines = (v: unknown, fallback: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof fallback === "string" ? [fallback] : [];

export function slim(scene: Json): Sketch {
  const text = (v: unknown) => (isObject(v) ? lines(v.lines, undefined).join(" ") : undefined);
  return {
    width: Number(scene.width) || 1,
    height: Number(scene.height) || 1,
    title: text(scene.title),
    subtitle: text(scene.subtitle),
    groups: list(scene.groups).map((g) => ({
      ...rect(g),
      id: String(g.id),
      label: String(g.label ?? ""),
      parent: typeof g.parent === "string" ? g.parent : undefined,
    })),
    nodes: list(scene.nodes).map((n) => ({
      ...rect(n),
      id: String(n.id),
      lines: lines(n.lines, n.label),
      group: typeof n.group === "string" ? n.group : undefined,
      shape: typeof n.shape === "string" ? n.shape : undefined,
      tone: typeof n.tone === "string" ? n.tone : undefined,
    })),
    edges: list(scene.edges).map((e) => ({
      id: String(e.id),
      from: String(e.from),
      to: String(e.to),
      points: list(e.points).map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })),
      dashed: e.style === "dashed",
      both: e.bidirectional === true,
      tone: typeof e.tone === "string" ? e.tone : undefined,
      label: isObject(e.labelBox)
        ? { ...rect(e.labelBox), lines: lines(e.labelBox.lines, e.label) }
        : undefined,
    })),
    steps: list(scene.steps).map((s) => ({
      title: String(s.title ?? ""),
      text: typeof s.text === "string" ? s.text : undefined,
      highlight: Array.isArray(s.highlight) ? s.highlight.map(String) : [],
    })),
    extras: ["parts", "wires", "labels", "images"].reduce((n, k) => n + list(scene[k]).length, 0),
  };
}
