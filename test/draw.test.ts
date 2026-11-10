import { describe, expect, it } from "vitest";
import { figureIssues, layoutFigure, stateAt } from "../src/figures/index.js";
import { bounds } from "../src/figures/common.js";
import type { DrawSpec, Primitive, SceneFigure } from "../src/figures/types.js";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder, SceneError } from "../src/scene/builder.js";
import { parseCompact } from "../src/scene/compact.js";
import { fillScene } from "../src/scene/fill.js";

const draw = (source: string): SceneFigure => parseCompact(source).figures[0]!;
const shapes = (source: string) => (draw(source).spec as DrawSpec).shapes;

async function build(source: string) {
  const parts = await PartIndex.load();
  const builder = new SceneBuilder(parts);
  await fillScene(builder, parseCompact(source));
  return { builder, parts };
}

const labelBoxes = (prims: Primitive[]) =>
  prims.filter((p) => p.t === "text").map((p) => bounds([p]));

describe("draw figure syntax", () => {
  it("reads the header with size, group and title", () => {
    const fig = draw("draw pic 160x90 in g: A title\ncircle 1,2 3");
    expect(fig).toMatchObject({ id: "pic", group: "g", title: "A title", spec: { width: 160, height: 90 } });
  });

  it("defaults to a 100x100 canvas", () => {
    expect(draw("draw pic\ncircle 1,2 3").spec).toMatchObject({ width: 100, height: 100 });
  });

  it("reads every kind of shape", () => {
    const geos = shapes(`draw p
circle a 10,20 5
ellipse 10,20 5 6
rect 1,2 3 4
line 0,0 9,9
arrow 0,0 9,9
curve 0,0 5,5 9,0
shape 0,0 9,0 9,9
blob 0,0 9,0 9,9
arc 5,5 4 0 90
text 5,5 Hello, world`).map((s) => s.geo.g);
    expect(geos).toEqual(["ellipse", "ellipse", "rect", "path", "path", "path", "path", "path", "arc", "text"]);
  });

  it("takes names, options and labels", () => {
    expect(shapes("draw p\ncircle core 50,50 9 fill=accent --dashed stage=2 !muted ~ The nucleus")[0]).toMatchObject({
      name: "core",
      fill: "accent",
      dashed: true,
      stage: 2,
      tone: "muted",
      label: "The nucleus",
    });
  });

  it("accepts a rectangle's size written as a pair", () => {
    expect(shapes("draw p\nrect 1,2 30,40")[0]!.geo).toMatchObject({ w: "30", h: "40" });
  });

  it("accepts math and spaced or bracketed points", () => {
    const [a, b] = shapes("draw p\ncircle 50+10*cos(0),(1+1)*5 3\nline (1, 2) 3, 4");
    expect(a!.geo).toMatchObject({ cx: "50+10*cos(0)", cy: "(1+1)*5" });
    expect(b!.geo).toMatchObject({ points: [["1", "2"], ["3", "4"]] });
  });

  it("keeps commas and words in free text", () => {
    expect(shapes("draw p\ntext 5,5 Hello, big world size=20")[0]).toMatchObject({
      size: 20,
      geo: { text: "Hello, big world" },
    });
  });

  it("keeps a drawing open across blank lines and ends at other lines", () => {
    const scene = parseCompact("draw p\ncircle 1,1 1\n\ncircle 2,2 1\nbox A box");
    expect((scene.figures[0]!.spec as DrawSpec).shapes).toHaveLength(2);
    expect(scene.nodes.map((n) => n.id)).toEqual(["box"]);
  });

  it("explains bad lines", () => {
    expect(() => parseCompact("draw p\ncircle 1,1")).toThrow(/circle \[name\]/);
    expect(() => parseCompact("draw p\ncircle 1,1 2 fill=pink")).toThrow(/unknown color/);
    expect(() => parseCompact("draw p\nshape 1,1 2,2")).toThrow(/at least 3/);
  });
});

describe("draw figure layout", () => {
  it("scales the longer side of the canvas and keeps circles round", () => {
    const { prims } = layoutFigure(draw("draw p 200x100\ncircle 100,50 25"));
    expect(prims[0]).toMatchObject({ t: "ellipse", rx: 65, ry: 65 });
  });

  it("puts a label inside a shape it fits in", () => {
    const { prims } = layoutFigure(draw("draw p\nrect 10,10 80 80 ~ Room"));
    const rect = bounds(prims.filter((p) => p.t === "rect"));
    const label = labelBoxes(prims)[0]!;
    expect(label.x).toBeGreaterThan(rect.x);
    expect(label.x + label.w).toBeLessThan(rect.x + rect.w);
  });

  it("keeps labels of crowded shapes apart", () => {
    const fig = draw(`draw p
circle a 50,50 2 ~ First long label
circle b 52,50 2 ~ Second long label
circle c 50,52 2 ~ Third long label
circle d 52,52 2 ~ Fourth long label`);
    const boxes = labelBoxes(layoutFigure(fig).prims);
    for (const [i, a] of boxes.entries())
      for (const b of boxes.slice(i + 1))
        expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
  });

  it("never leaves the figure's box", () => {
    const fig = draw("draw p: Title\ncircle 1,1 1 ~ A label far too wide for this corner of the canvas");
    const layout = layoutFigure(fig);
    const box = bounds(layout.prims);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w).toBeLessThanOrEqual(layout.width + 1);
    expect(box.y + box.h).toBeLessThanOrEqual(layout.height + 1);
  });

  it("reveals shapes by stage without changing size", () => {
    const fig = draw("draw p\ncircle 50,50 10\ncircle 80,80 10 stage=2 ~ Later");
    const all = layoutFigure(fig);
    const first = layoutFigure(fig, { p: "1" });
    const second = layoutFigure(fig, { p: "2" });
    expect(first.prims.filter((p) => p.t === "ellipse")).toHaveLength(1);
    expect(second.prims.filter((p) => p.t === "ellipse")).toHaveLength(2);
    expect(all.prims).toEqual(second.prims);
    expect([first.width, first.height]).toEqual([all.width, all.height]);
  });

  it("keys a named shape and its label for highlights", () => {
    const { prims } = layoutFigure(draw("draw p\ncircle core 50,50 10 ~ Core"));
    expect(prims.filter((p) => p.key === "p[core]").map((p) => p.t).sort()).toEqual(["ellipse", "text"]);
  });

  it("carries stages through steps", () => {
    const steps = [{ set: { p: "1" } }, {}, { set: { p: "3" } }];
    expect(stateAt(steps, 1)).toEqual({ p: "1" });
    expect(stateAt(steps, 2)).toEqual({ p: "3" });
  });
});

describe("draw figures in scenes", () => {
  it("connects to nodes and gets laid out", async () => {
    const { builder, parts } = await build("draw pic\ncircle 50,50 20\n\nbox A box\nbox -> pic feeds");
    const laid = await layoutScene(builder.scene, parts, { editor: "vscode" });
    expect(laid.figures).toHaveLength(1);
    expect(laid.edges).toHaveLength(1);
    expect(laid.figures[0]!.prims.length).toBeGreaterThan(0);
  });

  it("rejects empty drawings and doubled names", async () => {
    await expect(build("draw pic\nbox A box")).rejects.toThrow(SceneError);
    await expect(build("draw pic\ncircle a 1,1 1\ncircle a 2,2 1")).rejects.toThrow(/twice/);
  });

  it("checks what steps refer to", async () => {
    const pic = "draw pic\ncircle a 1,1 1\n";
    await expect(build(`${pic}step S: t | pic[nope]`)).rejects.toThrow(/unknown ids/);
    await expect(build(`${pic}step S: t | pic=two`)).rejects.toThrow(/whole number/);
    await expect(build(`${pic}step S: t | pic[a] pic=1`)).resolves.toBeDefined();
  });
});

describe("draw figure extras", () => {
  it("expands repeat, with the variable in coordinates and braces", () => {
    const list = shapes("draw p\nrepeat i=0..2: circle s{i+1} 10*i,5 1 ~ No {i+1}");
    expect(list.map((s) => s.name)).toEqual(["s1", "s2", "s3"]);
    expect(list.map((s) => s.label)).toEqual(["No 1", "No 2", "No 3"]);
    expect(layoutFigure(draw("draw p\nrepeat i=0..2: circle 10*i,5 1")).prims.filter((p) => p.t === "ellipse")).toHaveLength(3);
  });

  it("limits repeat", () => {
    expect(() => parseCompact("draw p\nrepeat i=0..9999: circle i,1 1")).toThrow(/at most/);
  });

  it("draws objects made of several shapes under one name", () => {
    const { prims } = layoutFigure(draw("draw p\nobject person me 50,50 40 ~ Me"));
    const parts = prims.filter((p) => p.key === "p[me]");
    expect(parts.length).toBeGreaterThan(4);
    expect(parts.some((p) => p.t === "text" && p.text === "Me")).toBe(true);
  });

  it("names unknown objects", () => {
    expect(() => parseCompact("draw p\nobject dragon 5,5")).toThrow(/use person/);
  });

  it("rotates and flips objects", () => {
    const fig = (extra: string) =>
      JSON.stringify(layoutFigure(draw(`draw p\nobject car 50,50 40 ${extra}`)).prims.filter((p) => p.t !== "text"));
    expect(fig("rotate=45")).not.toEqual(fig(""));
    expect(fig("flip")).not.toEqual(fig(""));
  });

  it("moves shapes with sliders and keeps the figure's box", () => {
    const fig = draw("draw p\nslider a 0..50 = 0\ncircle c 20+a,50 5 ~ Dot");
    const at = (v: string) => layoutFigure(fig, { a: v });
    const dot = (l: { prims: Primitive[] }) => l.prims.find((p) => p.t === "ellipse") as { cx: number };
    const scale = 5.2;
    expect(dot(at("50")).cx - dot(at("0")).cx).toBeCloseTo(50 * scale, 5);
    expect([at("50").width, at("50").height]).toEqual([at("0").width, at("0").height]);
    const label = (l: { prims: Primitive[] }) => l.prims.find((p) => p.t === "text") as { x: number };
    expect(label(at("50")).x - label(at("0")).x).toBeCloseTo(50 * scale, 5);
  });

  it("rejects names a slider does not define", () => {
    expect(() => parseCompact("draw p\ncircle a,5 1")).toThrow(/Unknown name/);
  });

  it("moves a shape along a named path", () => {
    const fig = draw("draw p\nslider t2 0..1 = 0\nline road 0,50 100,50\ncircle dot 0,0 2 along=road@t2");
    const x = (v: string) => (layoutFigure(fig, { t2: v }).prims.find((p) => p.t === "ellipse") as { cx: number }).cx;
    expect(x("1") - x("0")).toBeCloseTo(520, 0);
    expect(x("0.5") - x("0")).toBeCloseTo(260, 0);
  });

  it("shifts a shape as one rigid piece with move", () => {
    const fig = draw("draw p\nslider m 0..1 = 0\nshape tri 10,10 40,10 10,30 move=30*m,20*m\ncircle dot 0,0 2 along=tri@0");
    const at = (v: string) => layoutFigure(fig, { m: v }).prims;
    const poly = (v: string) => (at(v).find((p) => p.t === "poly") as { points: [number, number][] }).points;
    const scale = 5.2;
    poly("1").forEach(([x, y], i) => {
      expect(x - poly("0")[i]![0]).toBeCloseTo(30 * scale, 5);
      expect(y - poly("0")[i]![1]).toBeCloseTo(20 * scale, 5);
    });
    // A rider on the moved shape comes along.
    const dot = (v: string) => at(v).find((p) => p.t === "ellipse") as { cx: number };
    expect(dot("1").cx - dot("0").cx).toBeCloseTo(30 * scale, 5);
    expect(() => draw("draw p\ncircle 0,0 1 move=5")).toThrow(/move=<dx>,<dy>/);
    // Text takes the option too instead of printing it.
    const text = shapes("draw p\nslider m 0..1\ntext t 10,10 Hi there move=5*m,0")[0]!;
    expect(text.geo).toMatchObject({ g: "text", text: "Hi there" });
    expect(text.move).toEqual({ dx: "5*m", dy: "0" });
    const moved = draw("draw p\nslider m 0..1\ntext t 10,10 Hi move=5*m,0");
    const tx = (v: string) => (layoutFigure(moved, { m: v }).prims.find((p) => p.t === "text") as { x: number }).x;
    expect(tx("1") - tx("0")).toBeCloseTo(5 * 5.2, 5);
  });

  it("names sub-expressions with let", () => {
    const list = shapes("draw p\nslider m 0..1\nlet w = 10+5*m\nlet half = w/2\nrect 0,0 w half");
    expect(list[0]!.geo).toMatchObject({ g: "rect", w: "(10+5*m)", h: "((10+5*m)/2)" });
    expect(() => draw("draw p\nlet pi = 3")).toThrow(/already a slider, function or constant/);
    expect(() => draw("draw p\nlet w = q+1")).toThrow(/Unknown name/);
  });

  it("draws angles, dimension lines, braces, axes and grids", () => {
    const prims = (line: string, label = "") =>
      layoutFigure(draw(`draw p\n${line}${label}`)).prims.filter((p) => p.t !== "text" || label === "");
    // A right angle gets a square corner of three points, other angles an arc.
    const right = prims("angle 50,10 10,10 10,50").find((p) => p.t === "poly") as { points: unknown[] };
    expect(right.points).toHaveLength(3);
    const arc = prims("angle 50,10 10,10 40,40").find((p) => p.t === "poly") as { points: unknown[] };
    expect(arc.points.length).toBeGreaterThan(3);
    expect(prims("measure 10,50 90,50 6").find((p) => p.t === "line" && p.arrow === "both")).toBeDefined();
    expect(prims("brace 10,50 90,50").some((p) => p.t === "poly")).toBe(true);
    const axes = layoutFigure(draw("draw p\naxes 10,90 80 80 ticks=20 ~ t in s | v")).prims;
    expect(axes.filter((p) => p.t === "text").map((p) => (p as { text: string }).text)).toEqual(["t in s", "v"]);
    expect(axes.filter((p) => p.t === "line").length).toBe(2 + 3 + 3);
    expect(prims("grid 0,0 100 50 25").filter((p) => p.t === "line")).toHaveLength(5 + 3);
    expect(() => draw("draw p\nangle 1,1 2,2")).toThrow(/expected: angle/);
  });

  it("tells the model about text on text and shapes off the canvas", () => {
    const { figures, steps } = parseCompact(
      [
        "draw p 100x60",
        "slider m 0..1 = 0 hidden",
        "text 50,30 Hello world",
        "text 52,31 Hello again",
        "circle dot 20,30 5 move=100*m,0",
        "step Go: away | m=1",
      ].join("\n"),
    );
    const issues = figureIssues(figures, steps);
    expect(issues).toContain('"Hello world" and "Hello again" overlap at the start');
    expect(figureIssues(parseCompact("draw r\ncircle 200,50 5").figures, [])).toEqual(["the ellipse r[1] reaches past the 100x100 canvas at the start"]);
    expect(issues).toContain("p[dot] reaches past the 100x60 canvas in step 1");
    expect(figureIssues(parseCompact("draw q\ncircle 50,50 10 ~ Fine").figures, [])).toEqual([]);
  });

  it("checks along targets and slider assignments", async () => {
    await expect(build("draw p\ncircle 0,0 1 along=nope@0.5")).rejects.toThrow(/to move along/);
    const base = "draw p\nslider a 0..1 hidden\ncircle c a,1 1\n";
    await expect(build(`${base}step S: t | a=0.5`)).resolves.toBeDefined();
    await expect(build(`${base}step S: t | a=9`)).rejects.toThrow(/outside/);
  });

  it("carries a resolved icon to the viewer", async () => {
    const { builder, parts } = await build("draw p\nicon 50,50 globe 20");
    const laid = await layoutScene(builder.scene, parts, { editor: "vscode" });
    expect(laid.figures[0]!.prims.some((p) => p.t === "icon" && p.body.includes("<"))).toBe(true);
  });
});
