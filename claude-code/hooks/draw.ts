/**
 * Draws a laid-out Sketchy scene as terminal cells: box-drawing characters for
 * boxes, groups and edges, the label text itself, and a few colors. Pure, so
 * it runs in the Claude Code hooks runtime and in tests alike.
 */
import type { Pt, Rect, Sketch, SketchEdge } from "../types";

const DEFAULT = 0x01000000;
const MUTED = 0x8c8c8c;
const ACCENT_BG = 0xffe066;
const ACCENT_FG = 0x1a1a1a;
const ACCENT_LINE = 0xe0a000;

const N = 1;
const E = 2;
const S = 4;
const W = 8;
const LINE: Record<number, string> = {
  [E | W]: "─",
  [N | S]: "│",
  [S | E]: "┌",
  [S | W]: "┐",
  [N | E]: "└",
  [N | W]: "┘",
  [N | S | E]: "├",
  [N | S | W]: "┤",
  [E | W | S]: "┬",
  [E | W | N]: "┴",
  [N | E | S | W]: "┼",
  [E]: "─",
  [W]: "─",
  [N]: "│",
  [S]: "│",
};
const DASHED: Record<number, string> = {
  [E | W]: "╌",
  [E]: "╌",
  [W]: "╌",
  [N | S]: "╎",
  [N]: "╎",
  [S]: "╎",
};

/** What a `Raster` takes: little-endian u32 triplets [codePoint, fg, bg], base64. */
export type Cells = { columns: number; rows: number; data: string };

class Grid {
  readonly ch: number[];
  readonly fg: number[];
  readonly bg: number[];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.ch = new Array(w * h).fill(32);
    this.fg = new Array(w * h).fill(DEFAULT);
    this.bg = new Array(w * h).fill(DEFAULT);
  }
  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, c: string, fg = DEFAULT, bg?: number) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.ch[i] = c.codePointAt(0) ?? 32;
    this.fg[i] = fg;
    if (bg !== undefined) this.bg[i] = bg;
  }
  text(x: number, y: number, s: string, fg = DEFAULT, bg?: number) {
    let i = 0;
    for (const c of s) this.set(x + i++, y, printable(c), fg, bg);
  }
  /** The cells, cropped to what was drawn. */
  encode(): Cells {
    let [x0, y0, x1, y1] = [this.w, this.h, -1, -1];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.ch[i] === 32 && this.bg[i] === DEFAULT) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    if (x1 < 0) [x0, y0, x1, y1] = [0, 0, 0, 0];
    const columns = x1 - x0 + 1;
    const rows = y1 - y0 + 1;
    const words = new Uint32Array(columns * rows * 3);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const i = (y0 + y) * this.w + x0 + x;
        const o = (y * columns + x) * 3;
        words[o] = this.ch[i]!;
        words[o + 1] = this.fg[i]!;
        words[o + 2] = this.bg[i]!;
      }
    }
    return { columns, rows, data: base64(new Uint8Array(words.buffer)) };
  }
}

/** Raster cells take one width-1 BMP character; anything else becomes "?". */
function printable(c: string): string {
  const code = c.codePointAt(0) ?? 63;
  if (code < 32 || code > 0xffff) return "?";
  if (code >= 0x1100 && /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(c)) return "?";
  return c;
}

const fit = (s: string, room: number) =>
  s.length <= room ? s : room <= 1 ? s.slice(0, room) : s.slice(0, room - 1) + "…";

type CellRect = { x0: number; y0: number; x1: number; y1: number };

/** Draws the sketch; labels wrap onto more lines until it fits `maxColumns`. */
export function draw(sketch: Sketch, maxColumns: number, step: number): Cells {
  let cells = paint(sketch, maxColumns, step, false);
  // Narrower and narrower labels, then tighter spacing around them.
  for (const [width, tight] of [
    [20, false],
    [16, false],
    [12, false],
    [12, true],
    [9, true],
  ] as const) {
    if (cells.columns <= maxColumns) break;
    cells = paint(rewrap(sketch, width), maxColumns, step, tight);
  }
  return cells;
}

function wrap(lines: string[], width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of lines.join(" ").split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

function rewrap(sketch: Sketch, width: number): Sketch {
  return {
    ...sketch,
    nodes: sketch.nodes.map((n) => ({ ...n, lines: wrap(n.lines, width) })),
    edges: sketch.edges.map((e) =>
      e.label ? { ...e, label: { ...e.label, lines: wrap(e.label.lines, width) } } : e,
    ),
  };
}

function paint(sketch: Sketch, maxColumns: number, step: number, tight: boolean): Cells {
  const pad = tight ? 2 : 4;
  const gap = tight ? 3 : 4;
  // Boxes keep the room their labels need; only the gaps between them shrink.
  type Need = [number, number, number];
  const xs: Need[] = [];
  const ys: Need[] = [];
  const cap = (s: string) => s.length;
  for (const n of sketch.nodes) {
    xs.push([n.x, n.x + n.width, Math.max(1, ...n.lines.map(cap)) + pad]);
    ys.push([n.y, n.y + n.height, n.lines.length + 2]);
  }
  for (const e of sketch.edges) {
    if (!e.label || e.label.lines.length === 0) continue;
    // Tight drawings let a label sit on its line rather than widen the gap.
    if (!tight)
      xs.push([e.label.x, e.label.x + e.label.width, Math.max(...e.label.lines.map(cap)) + 2]);
    ys.push([e.label.y, e.label.y + e.label.height, e.label.lines.length]);
  }
  const kids = (id: string): Rect[] => [
    ...sketch.nodes.filter((n) => n.group === id),
    ...sketch.groups.filter((g) => g.parent === id),
  ];
  for (const g of sketch.groups) {
    xs.push([g.x, g.x + g.width, g.label.length + 6]);
    for (const k of kids(g.id)) {
      xs.push([g.x, k.x, 2], [k.x + k.width, g.x + g.width, 2]);
      ys.push([g.y, k.y, 2], [k.y + k.height, g.y + g.height, 2]);
    }
  }
  // Room for a line and its arrowhead between boxes an edge joins.
  const byId = new Map(sketch.nodes.map((n) => [n.id, n]));
  for (const e of sketch.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const [l, r] = a.x <= b.x ? [a, b] : [b, a];
    if (l.x + l.width < r.x) xs.push([l.x + l.width, r.x, gap]);
    const [t, d] = a.y <= b.y ? [a, b] : [b, a];
    if (t.y + t.height < d.y) ys.push([t.y + t.height, d.y, 3]);
  }
  // The stubs where edges meet boxes keep two cells, so arrowheads have room,
  // and a box side with several edges grows so each gets its own cell.
  const perSide = new Map<string, number>();
  const count = (key: string) => perSide.set(key, (perSide.get(key) ?? 0) + 1);
  for (const e of sketch.edges) {
    const p = e.points;
    if (p.length < 2) continue;
    for (const [a, b, id] of [
      [p[0]!, p[1]!, e.from],
      [p[p.length - 1]!, p[p.length - 2]!, e.to],
    ] as const) {
      if (Math.abs(a.x - b.x) < 0.5) ys.push([Math.min(a.y, b.y), Math.max(a.y, b.y), 2]);
      else if (Math.abs(a.y - b.y) < 0.5) xs.push([Math.min(a.x, b.x), Math.max(a.x, b.x), 2]);
      const n = byId.get(id);
      if (n) count(`${id}:${sideOf(n, a)}`);
    }
  }
  for (const [key, k] of perSide) {
    const n = byId.get(key.slice(0, key.lastIndexOf(":")))!;
    const side = key.slice(key.lastIndexOf(":") + 1);
    if (side === "left" || side === "right") ys.push([n.y, n.y + n.height, 2 * k + 1]);
    else xs.push([n.x, n.x + n.width, 2 * k + 1]);
  }
  const fx = warp(sketch.width, xs, maxColumns - 1, 1 / 8);
  const fy = warp(sketch.height, ys, 48, 1 / 24);
  const grid = new Grid(
    Math.max(1, Math.min(512, Math.ceil(fx(sketch.width)) + 1)),
    Math.max(1, Math.min(256, Math.ceil(fy(sketch.height)) + 1)),
  );
  const cell = (p: Pt): Pt => ({ x: Math.round(fx(p.x)), y: Math.round(fy(p.y)) });
  const cellRect = (r: Rect): CellRect => {
    const x0 = Math.round(fx(r.x));
    const y0 = Math.round(fy(r.y));
    return {
      x0,
      y0,
      x1: Math.max(x0 + 2, Math.round(fx(r.x + r.width)) - 1),
      y1: Math.max(y0 + 2, Math.round(fy(r.y + r.height)) - 1),
    };
  };

  const active = sketch.steps[step];
  const lit = new Set(active?.highlight ?? []);
  const nodeLit = (id: string, tone?: string) => (active ? lit.has(id) : tone === "accent");
  const edgeLit = (e: SketchEdge) =>
    active
      ? lit.has(e.id) || lit.has(`${e.from}->${e.to}`) || lit.has(`${e.to}->${e.from}`)
      : e.tone === "accent";
  const dim = (id: string, tone?: string) => (active ? !lit.has(id) : tone === "muted");

  // Groups: dashed frames with the label set into the top border.
  for (const g of sketch.groups) {
    const r = cellRect(g);
    frame(grid, r, { h: "┄", v: "┆", tl: "╭", tr: "╮", bl: "╰", br: "╯" }, MUTED);
    if (g.label) grid.text(r.x0 + 2, r.y0, ` ${fit(g.label, r.x1 - r.x0 - 4)} `, MUTED);
  }

  // Edges: orthogonal runs merged into box-drawing characters.
  const nodeRects = sketch.nodes.map(cellRect);
  const inNode = (p: Pt) =>
    nodeRects.some((r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1);
  const nodeIndex = new Map(sketch.nodes.map((n, i) => [n.id, i]));
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  /** The cell just outside a node's border where an edge meets it, and which side. */
  const snap = (p: Pt, id: string): { cell: Pt; side: Side } | undefined => {
    const i = nodeIndex.get(id);
    if (i === undefined) return undefined;
    const n = sketch.nodes[i]!;
    const r = nodeRects[i]!;
    const side = sideOf(n, p);
    const c = cell(p);
    const y = clamp(c.y, r.y0 + 1, Math.max(r.y0 + 1, r.y1 - 1));
    const x = clamp(c.x, r.x0 + 1, Math.max(r.x0 + 1, r.x1 - 1));
    const at: Record<Side, Pt> = {
      left: { x: r.x0 - 1, y },
      right: { x: r.x1 + 1, y },
      top: { x, y: r.y0 - 1 },
      bottom: { x, y: r.y1 + 1 },
    };
    return { cell: at[side], side };
  };
  const heads: [Pt, string, number][] = [];
  for (const e of sketch.edges) {
    if (e.points.length < 2) continue;
    const color = edgeLit(e) ? ACCENT_LINE : active || e.tone === "muted" ? MUTED : DEFAULT;
    const pts = e.points.map(cell);
    const start = snap(e.points[0]!, e.from);
    const end = snap(e.points[e.points.length - 1]!, e.to);
    const n = pts.length;
    if (start) {
      if (n > 2) align(e.points[0]!, e.points[1]!, pts[1]!, start.cell);
      pts[0] = start.cell;
    }
    if (end) {
      if (n > 2) align(e.points[n - 1]!, e.points[n - 2]!, pts[n - 2]!, end.cell);
      pts[n - 1] = end.cell;
    }
    // A straight edge between facing sides runs on one shared row or column.
    const flatY = e.points.every((q) => Math.abs(q.y - e.points[0]!.y) < 1.5);
    const flatX = e.points.every((q) => Math.abs(q.x - e.points[0]!.x) < 1.5);
    if ((n === 2 || flatX || flatY) && start && end) {
      const ra = nodeRects[nodeIndex.get(e.from)!]!;
      const rb = nodeRects[nodeIndex.get(e.to)!]!;
      const sides = `${start.side}-${end.side}`;
      if (sides === "right-left" || sides === "left-right") {
        const lo = Math.max(ra.y0, rb.y0) + 1;
        const hi = Math.min(ra.y1, rb.y1) - 1;
        if (lo <= hi) {
          const y = clamp(end.cell.y, lo, hi);
          for (const q of pts) q.y = y;
        }
      } else if (sides === "bottom-top" || sides === "top-bottom") {
        const lo = Math.max(ra.x0, rb.x0) + 1;
        const hi = Math.min(ra.x1, rb.x1) - 1;
        if (lo <= hi) {
          const x = clamp(end.cell.x, lo, hi);
          for (const q of pts) q.x = x;
        }
      }
    }
    const bits = new Map<number, number>();
    const mark = (x: number, y: number, b: number) => {
      if (grid.inside(x, y)) bits.set(y * grid.w + x, (bits.get(y * grid.w + x) ?? 0) | b);
    };
    const line = (p: Pt, q: Pt) => {
      if (p.y === q.y) {
        const [l, r] = p.x < q.x ? [p.x, q.x] : [q.x, p.x];
        for (let x = l; x < r; x++) {
          mark(x, p.y, E);
          mark(x + 1, p.y, W);
        }
      } else {
        const [t, d] = p.y < q.y ? [p.y, q.y] : [q.y, p.y];
        for (let y = t; y < d; y++) {
          mark(p.x, y, S);
          mark(p.x, y + 1, N);
        }
      }
    };
    /** A rounding diagonal becomes an L (or a Z), leaving and entering boxes square. */
    const run = (a: Pt, b: Pt, leaveH: boolean, enterH: boolean) => {
      if (a.x === b.x || a.y === b.y) return line(a, b);
      if (leaveH && enterH) {
        const mx = Math.round((a.x + b.x) / 2);
        line(a, { x: mx, y: a.y });
        line({ x: mx, y: a.y }, { x: mx, y: b.y });
        return line({ x: mx, y: b.y }, b);
      }
      if (!leaveH && !enterH) {
        const my = Math.round((a.y + b.y) / 2);
        line(a, { x: a.x, y: my });
        line({ x: a.x, y: my }, { x: b.x, y: my });
        return line({ x: b.x, y: my }, b);
      }
      const corner = leaveH ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
      line(a, corner);
      line(corner, b);
    };
    const across = (side?: Side) => side === "left" || side === "right";
    const last = pts.length - 1;
    for (let i = 1; i <= last; i++) {
      const leaveH = i === 1 && start ? across(start.side) : true;
      const enterH = i === last && end ? across(end.side) : !leaveH;
      run(pts[i - 1]!, pts[i]!, leaveH, enterH);
    }
    for (const [i, b] of bits) {
      const ch = (e.dashed && DASHED[b]) || LINE[b] || "·";
      grid.set(i % grid.w, Math.floor(i / grid.w), ch, color);
    }
    if (end) heads.push([end.cell, HEAD[end.side], color]);
    if (e.both && start) heads.push([start.cell, HEAD[start.side], color]);
  }

  for (const [p, c, color] of heads) grid.set(p.x, p.y, c, color);

  // Nodes over the edges, so lines end at their borders.
  sketch.nodes.forEach((n, k) => {
    const r = nodeRects[k]!;
    const accent = nodeLit(n.id, n.tone);
    const fg = accent ? ACCENT_FG : dim(n.id, n.tone) ? MUTED : DEFAULT;
    const bg = accent ? ACCENT_BG : DEFAULT;
    for (let y = r.y0; y <= r.y1; y++)
      for (let x = r.x0; x <= r.x1; x++) grid.set(x, y, " ", fg, bg);
    if (n.shape !== "text") {
      const round =
        n.shape === "rounded" ||
        n.shape === "circle" ||
        n.shape === "person" ||
        n.shape === "cylinder";
      frame(
        grid,
        r,
        round
          ? { h: "─", v: "│", tl: "╭", tr: "╮", bl: "╰", br: "╯" }
          : { h: "─", v: "│", tl: "┌", tr: "┐", bl: "└", br: "┘" },
        fg,
        bg,
      );
      if (n.shape === "cylinder" && r.y1 - r.y0 > 3) {
        grid.set(r.x0, r.y0 + 1, "├", fg, bg);
        for (let x = r.x0 + 1; x < r.x1; x++) grid.set(x, r.y0 + 1, "─", fg, bg);
        grid.set(r.x1, r.y0 + 1, "┤", fg, bg);
      }
      if (n.shape === "note") grid.set(r.x1, r.y0, "◹", fg, bg);
    }
    const room = r.x1 - r.x0 - 1;
    const top = r.y0 + Math.max(1, Math.floor((r.y1 - r.y0 + 1 - n.lines.length) / 2));
    n.lines.forEach((line, i) => {
      const s = fit(line, room);
      const y = top + i;
      if (y < r.y1 || n.shape === "text")
        grid.text(r.x0 + 1 + Math.floor((room - s.length) / 2), y, s, fg, bg);
    });
  });

  // Edge labels last, never over a box: shifted to the nearest free spot or left out.
  for (const e of sketch.edges) {
    const label = e.label;
    if (!label || label.lines.length === 0) continue;
    const c = cell({ x: label.x + label.width / 2, y: label.y + label.height / 2 });
    const color = edgeLit(e) ? ACCENT_LINE : MUTED;
    const texts = label.lines.map((line) => [...fit(line, grid.w)]);
    const widest = Math.max(...texts.map((t) => t.length));
    const free = (dx: number, dy: number) =>
      texts.every((t, i) => {
        const y = c.y - Math.floor(texts.length / 2) + i + dy;
        const x = c.x - Math.floor(t.length / 2) + dx;
        return t.every((_, j) => grid.inside(x + j, y) && !inNode({ x: x + j, y }));
      });
    const shifts = [0, 1, -1, 2, -2, 3, -3].flatMap((dx) =>
      [0, 1, -1].map((dy) => [dx * Math.ceil(widest / 3), dy] as const),
    );
    const spot = shifts.find(([dx, dy]) => free(dx, dy));
    if (!spot) continue;
    texts.forEach((t, i) => {
      const y = c.y - Math.floor(texts.length / 2) + i + spot[1];
      const x = c.x - Math.floor(t.length / 2) + spot[0];
      t.forEach((ch, j) => grid.set(x + j, y, printable(ch), color));
    });
  }
  return grid.encode();
}

/**
 * A monotone map from scene pixels to cells: every [from, to, cells] span gets
 * at least that many cells, the rest scales by `base`, shrunk until the whole
 * fits `room` where it can. Monotone, so straight lines stay straight.
 */
function warp(
  total: number,
  needs: [number, number, number][],
  room: number,
  base: number,
): (v: number) => number {
  const cuts = [...new Set([0, total, ...needs.flatMap(([a, b]) => [a, b])])]
    .filter((v) => v >= 0 && v <= total)
    .sort((a, b) => a - b);
  const spans = cuts.slice(1).map((to, i) => ({ from: cuts[i]!, to }));
  const covered = spans.map((sp) =>
    needs.some(([a, b]) => a <= sp.from && b >= sp.to && b - a > 0),
  );
  const solve = (scale: number) => {
    const cells = spans.map((sp, i) => {
      const len = sp.to - sp.from;
      return covered[i] || len < 8 ? len * scale : Math.max(len * scale, 2);
    });
    for (let round = 0; round < 6; round++) {
      for (const [a, b, need] of needs) {
        let have = 0;
        const inside: number[] = [];
        spans.forEach((sp, i) => {
          if (sp.from >= a && sp.to <= b) {
            have += cells[i]!;
            inside.push(i);
          }
        });
        if (have >= need || inside.length === 0) continue;
        const add = (need - have) / inside.length;
        for (const i of inside) cells[i] = cells[i]! + add;
      }
    }
    return cells;
  };
  let scale = base;
  let cells = solve(scale);
  for (let tries = 0; tries < 12 && cells.reduce((s, c) => s + c, 0) > room; tries++) {
    scale *= 0.75;
    cells = solve(scale);
  }
  const starts: number[] = [0];
  for (const c of cells) starts.push(starts[starts.length - 1]! + c);
  return (v) => {
    if (v <= 0) return 0;
    for (let i = 0; i < spans.length; i++) {
      const sp = spans[i]!;
      if (v <= sp.to) {
        const len = sp.to - sp.from;
        return starts[i]! + (len > 0 ? ((v - sp.from) / len) * cells[i]! : 0);
      }
    }
    return starts[starts.length - 1]!;
  };
}

type Frame = { h: string; v: string; tl: string; tr: string; bl: string; br: string };
function frame(grid: Grid, r: CellRect, f: Frame, fg: number, bg?: number) {
  for (let x = r.x0 + 1; x < r.x1; x++) {
    grid.set(x, r.y0, f.h, fg, bg);
    grid.set(x, r.y1, f.h, fg, bg);
  }
  for (let y = r.y0 + 1; y < r.y1; y++) {
    grid.set(r.x0, y, f.v, fg, bg);
    grid.set(r.x1, y, f.v, fg, bg);
  }
  grid.set(r.x0, r.y0, f.tl, fg, bg);
  grid.set(r.x1, r.y0, f.tr, fg, bg);
  grid.set(r.x0, r.y1, f.bl, fg, bg);
  grid.set(r.x1, r.y1, f.br, fg, bg);
}

type Side = "left" | "right" | "top" | "bottom";

/** The side of a box a point on its border lies on. */
function sideOf(n: Rect, p: Pt): Side {
  const d: [Side, number][] = [
    ["left", Math.abs(p.x - n.x)],
    ["right", Math.abs(p.x - n.x - n.width)],
    ["top", Math.abs(p.y - n.y)],
    ["bottom", Math.abs(p.y - n.y - n.height)],
  ];
  return d.reduce((m, c) => (c[1] < m[1] ? c : m))[0];
}
const HEAD: Record<Side, string> = { left: "▶", right: "◀", top: "▼", bottom: "▲" };

/** Keeps a run straight after its end moved: the neighbour follows on the shared axis. */
function align(endPx: Pt, nextPx: Pt, next: Pt, moved: Pt) {
  if (Math.abs(endPx.y - nextPx.y) < 0.5) next.y = moved.y;
  else if (Math.abs(endPx.x - nextPx.x) < 0.5) next.x = moved.x;
}

function base64(bytes: Uint8Array): string {
  const native = (bytes as Uint8Array & { toBase64?: () => string }).toBase64;
  if (native) return native.call(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
