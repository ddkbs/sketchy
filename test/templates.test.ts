import { describe, expect, it } from "vitest";
import { bounds } from "../src/figures/common.js";
import { layoutFigure } from "../src/figures/index.js";
import type { SceneFigure, TemplateSpec } from "../src/figures/types.js";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { parseCompact } from "../src/scene/compact.js";
import { fillScene } from "../src/scene/fill.js";

const figure = (source: string): SceneFigure => parseCompact(source).figures[0]!;
const spec = (source: string) => figure(source).spec as TemplateSpec;

async function build(source: string) {
  const parts = await PartIndex.load();
  const builder = new SceneBuilder(parts);
  await fillScene(builder, parseCompact(source));
  return { builder, parts };
}

const SAMPLES: Record<string, string> = {
  timeline: "timeline t: T\n1990 | One\n2000 | Two ~ small\n2010 | Three",
  cycle: "cycle t\nA\nB ~ small\nC",
  pyramid: "pyramid t\nTop\nMiddle ~ small\nBase",
  funnel: "funnel t\nMany\nSome\nFew ~ small",
  venn: "venn t\nset a A\nset b B\na | Left\nb | Right\na,b | Both",
  matrix: "matrix t\ncols Name | X | Y\nFirst | 1 | 2\nSecond | 3 | 4",
  mindmap: "mindmap t\nCentre\n- One\n-- Sub\n- Two\n- Three",
};

describe("template syntax", () => {
  it("reads timeline dates, tone and small print", () => {
    expect(spec("timeline t\n1989 | The web !accent ~ At CERN").items[0]).toEqual({
      when: "1989",
      label: "The web",
      tone: "accent",
      detail: "At CERN",
    });
  });

  it("reads mind map depth", () => {
    expect(spec("mindmap m\nRoot\n- A\n-- B").items.map((i) => i.depth)).toEqual([0, 1, 2]);
  });

  it("reads venn sets and regions", () => {
    const s = spec("venn v\nset a Cats\nset b Dogs\na,b | Pets");
    expect(s.sets.map((x) => x.id)).toEqual(["a", "b"]);
    expect(s.items[0]).toMatchObject({ sets: ["a", "b"], label: "Pets" });
  });

  it("reads matrix columns and rows", () => {
    const s = spec("matrix m\ncols A | B\nRow | 1");
    expect(s.cols).toEqual(["A", "B"]);
    expect(s.items[0]).toMatchObject({ label: "Row", cells: ["1"] });
  });

  it("ends the entries at scene lines even without a blank line", () => {
    const scene = parseCompact("cycle c\nOne\nTwo\na -> b\nstep S: text | c[1]");
    expect((scene.figures[0]!.spec as TemplateSpec).items).toHaveLength(2);
    expect(scene.edges).toHaveLength(1);
    expect(scene.steps).toHaveLength(1);
  });
});

describe("template layout", () => {
  for (const [name, source] of Object.entries(SAMPLES)) {
    it(`${name} stays inside its box and shows every text`, () => {
      const layout = layoutFigure(figure(source));
      const box = bounds(layout.prims);
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.y).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.w).toBeLessThanOrEqual(layout.width + 1);
      expect(box.y + box.h).toBeLessThanOrEqual(layout.height + 1);
      for (const word of [...source.matchAll(/\b(First|Base|Both|Three|Few|Sub)\b/g)])
        expect(layout.prims.some((p) => p.t === "text" && p.text.includes(word[1]!))).toBe(true);
    });
  }

  it("does not overlap neighbouring timeline entries on one side", () => {
    const layout = layoutFigure(figure("timeline t\n1 | A rather long entry that wraps around\n2 | B\n3 | Another rather long entry that wraps\n4 | D"));
    const of = (n: number) => bounds(layout.prims.filter((p) => p.key === `t[${n}]` && p.t === "text"));
    expect(of(1).x + of(1).w).toBeLessThanOrEqual(of(3).x);
  });

  it("reveals entries without resizing", () => {
    const fig = figure(SAMPLES.cycle!);
    const all = layoutFigure(fig);
    const one = layoutFigure(fig, { t: "1" });
    const textOf = (l: typeof all) => l.prims.filter((p) => p.t === "rect").length;
    expect(textOf(one)).toBe(1);
    expect(textOf(all)).toBe(3);
    expect([one.width, one.height]).toEqual([all.width, all.height]);
  });
});

describe("templates in scenes", () => {
  it("lays out next to nodes", async () => {
    const { builder, parts } = await build("cycle c\nA\nB\n\nbox Box\nbox -> c");
    const laid = await layoutScene(builder.scene, parts, { editor: "vscode" });
    expect(laid.figures).toHaveLength(1);
    expect(laid.edges).toHaveLength(1);
  });

  it("validates contents and step references", async () => {
    await expect(build("cycle c\n\nbox Box")).rejects.toThrow(/no entries/);
    await expect(build("venn v\nset a A\na | x")).rejects.toThrow(/two or three/);
    await expect(build("venn v\nset a A\nset b B\nz | x")).rejects.toThrow(/no set "z"/);
    await expect(build("cycle c\nA\nB\n\nstep S: t | c[9]")).rejects.toThrow(/unknown ids/);
    await expect(build("cycle c\nA\nB\n\nstep S: t | c[2] c=x")).rejects.toThrow(/number of entries/);
    await expect(build("cycle c\nA\nB\n\nstep S: t | c[2] c=2")).resolves.toBeDefined();
  });
});
