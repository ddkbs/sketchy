import rough from "roughjs";
import type { RoughSVG } from "roughjs/bin/svg.js";
import type { Options } from "roughjs/bin/core.js";
import type { Point } from "../../src/scene/laid-out.js";
import { FONT_FAMILY } from "../../src/style/metrics.js";
import { INK } from "./palette.js";

export const SVG_NS = "http://www.w3.org/2000/svg";

/** Stable seed per element so a scene looks identical on every render. */
export function seedFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647 || 1;
}

export type Pen = {
  rc: RoughSVG;
  base: Options;
};

export function createPen(svg: SVGSVGElement): Pen {
  return {
    rc: rough.svg(svg),
    base: { roughness: 1.05, bowing: 0.9, stroke: INK, strokeWidth: 1.6, preserveVertices: false },
  };
}

export function opts(pen: Pen, id: string, extra: Options = {}): Options {
  return { ...pen.base, seed: seedFor(id), ...extra };
}

export function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | undefined> = {},
  children: Node[] = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) node.setAttribute(key, String(value));
  }
  for (const child of children) node.appendChild(child);
  return node;
}

export type TextOptions = {
  x: number;
  y: number;
  lines: string[];
  size: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  /** Maximum width; the viewer shrinks text that overflows. */
  fit?: number;
};

/** Multi-line text whose first baseline sits one line below `y`. */
export function text(o: TextOptions): SVGTextElement {
  const lh = Math.round(o.size * 1.3);
  const node = el("text", {
    x: o.x,
    y: o.y,
    "font-family": `${FONT_FAMILY}, "Comic Sans MS", cursive`,
    "font-size": o.size,
    "font-weight": o.weight,
    fill: o.color ?? INK,
    "text-anchor": o.anchor ?? "start",
    "data-fit": o.fit,
  });
  o.lines.forEach((line, i) => {
    const span = el("tspan", { x: o.x, y: o.y + lh * i + lh * 0.74 });
    span.textContent = line;
    node.appendChild(span);
  });
  return node;
}

/** Orthogonal polyline with softened corners, as a path for rough.js. */
export function roundedPath(points: Point[], radius = 10): string {
  if (points.length < 2) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    const next = points[i + 1]!;
    const r = Math.min(radius, dist(prev, cur) / 2, dist(cur, next) / 2);
    const a = toward(cur, prev, r);
    const b = toward(cur, next, r);
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`;
  }
  const last = points[points.length - 1]!;
  return `${d} L ${last.x} ${last.y}`;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function toward(from: Point, to: Point, length: number): Point {
  const d = dist(from, to) || 1;
  return { x: from.x + ((to.x - from.x) / d) * length, y: from.y + ((to.y - from.y) / d) * length };
}

/** The two barbs of an open arrowhead pointing from `from` to `tip`. */
export function arrowHead(from: Point, tip: Point, size = 13): [Point, Point, Point] {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const spread = 0.45;
  return [
    { x: tip.x - size * Math.cos(angle - spread), y: tip.y - size * Math.sin(angle - spread) },
    tip,
    { x: tip.x - size * Math.cos(angle + spread), y: tip.y - size * Math.sin(angle + spread) },
  ];
}

export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}
