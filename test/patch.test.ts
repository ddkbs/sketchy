import { describe, expect, it } from "vitest";
import type { DrawSpec } from "../src/figures/types.js";
import { parseCompact } from "../src/scene/compact.js";
import { applyPatch } from "../src/scene/patch.js";

const BASE = `title Original
group g Group
a Alpha in g
b Beta
c Gamma
a -> b first
b -> c
label a Note
step One: text | a b a->b
step Two: text | c b->c`;

const patched = (changes: string) => applyPatch(parseCompact(BASE), changes);

describe("edit patches", () => {
  it("replaces an element in place and keeps the rest", () => {
    const scene = patched("b Better !accent");
    expect(scene.nodes.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(scene.nodes[1]).toMatchObject({ label: "Better", tone: "accent" });
    expect(scene.title).toBe("Original");
    expect(scene.edges).toHaveLength(2);
    expect(scene.steps).toHaveLength(2);
  });

  it("adds new elements and updates arrows by their ends", () => {
    const scene = patched("d Delta\nc -> d\na --> b changed");
    expect(scene.nodes.map((n) => n.id)).toContain("d");
    expect(scene.edges).toHaveLength(3);
    expect(scene.edges[0]).toMatchObject({ label: "changed", style: "dashed" });
  });

  it("does not change the scene it starts from", () => {
    const base = parseCompact(BASE);
    applyPatch(base, "remove a\nb Other");
    expect(base.nodes[0]!.id).toBe("a");
    expect(base.nodes[1]!.label).toBe("Beta");
  });

  it("removes an element with what depends on it", () => {
    const scene = patched("remove a");
    expect(scene.nodes.map((n) => n.id)).toEqual(["b", "c"]);
    expect(scene.edges.map((e) => e.from)).toEqual(["b"]);
    expect(scene.labels).toHaveLength(0);
    expect(scene.steps[0]!.highlight).toEqual(["b"]);
  });

  it("keeps members of a removed group", () => {
    const scene = patched("remove g");
    expect(scene.groups).toHaveLength(0);
    expect(scene.nodes[0]!.group).toBeUndefined();
  });

  it("removes an arrow", () => {
    const scene = patched("remove a -> b");
    expect(scene.edges).toHaveLength(1);
    expect(scene.steps[0]!.highlight).toEqual(["a", "b"]);
  });

  it("replaces the walkthrough when steps are given", () => {
    expect(patched("step New: text | a").steps.map((s) => s.title)).toEqual(["New"]);
    expect(patched("remove steps").steps).toHaveLength(0);
  });

  it("explains removals that find nothing", () => {
    expect(() => patched("remove nope")).toThrow(/nothing called/);
    expect(() => patched("remove a -> c")).toThrow(/no arrow/);
  });

  it("edits a drawing shape by shape and keeps its size and title", () => {
    const base = parseCompact("draw pic 160x90: A title\ncircle one 1,1 1\ncircle two 2,2 2");
    const scene = applyPatch(base, "draw pic\ncircle one 9,9 9 fill=red\nline 0,0 1,1");
    const spec = scene.figures[0]!.spec as DrawSpec;
    expect(scene.figures[0]!.title).toBe("A title");
    expect([spec.width, spec.height]).toEqual([160, 90]);
    expect(spec.shapes.map((s) => s.name ?? s.geo.g)).toEqual(["one", "two", "path"]);
    expect(spec.shapes[0]!.geo).toMatchObject({ cx: "9" });
  });

  it("removes a single shape", () => {
    const base = parseCompact("draw pic\ncircle one 1,1 1\ncircle two 2,2 2\n\nstep S: t | pic[two] pic[one]");
    const scene = applyPatch(base, "remove pic[two]");
    expect((scene.figures[0]!.spec as DrawSpec).shapes).toHaveLength(1);
    expect(scene.steps[0]!.highlight).toEqual(["pic[one]"]);
    expect(() => applyPatch(base, "remove pic[nope]")).toThrow(/no shape/);
  });

  it("moves unnamed text and removes unnamed shapes by number", () => {
    const base = parseCompact("draw pic\ncircle 1,1 1\ntext 5,5 Hello\nline 0,0 9,9");
    const moved = applyPatch(base, "draw pic\ntext 5,20 Hello");
    const shapes = (moved.figures[0]!.spec as DrawSpec).shapes;
    expect(shapes).toHaveLength(3);
    expect(shapes[1]!.geo).toMatchObject({ g: "text", y: "20" });
    const removed = applyPatch(base, "remove pic[3]");
    expect((removed.figures[0]!.spec as DrawSpec).shapes.map((s) => s.geo.g)).toEqual(["ellipse", "text"]);
    expect(() => applyPatch(base, "remove pic[4]")).toThrow(/no shape/);
  });

  it("replaces other figures whole", () => {
    const base = parseCompact("cycle c\nA\nB");
    expect(applyPatch(base, "cycle c\nX\nY\nZ").figures).toHaveLength(1);
    expect((applyPatch(base, "cycle c\nX\nY\nZ").figures[0]!.spec as { items: unknown[] }).items).toHaveLength(3);
  });
});
