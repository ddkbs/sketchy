import { beforeAll, describe, expect, it } from "vitest";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import type { Rect } from "../src/scene/laid-out.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { SAMPLES } from "./fixtures.js";

let parts: PartIndex;
beforeAll(async () => {
  parts = await PartIndex.load();
});

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function build(sample: keyof typeof SAMPLES): SceneBuilder {
  const builder = new SceneBuilder(parts);
  SAMPLES[sample]!(builder);
  return builder;
}

describe("layoutScene", () => {
  it("places ten connected nodes without overlap", async () => {
    const b = new SceneBuilder(parts);
    for (let i = 0; i < 10; i++) b.addNode({ id: `n${i}`, label: `Node number ${i}` });
    for (let i = 1; i < 10; i++) b.addEdge({ from: `n${Math.floor((i - 1) / 2)}`, to: `n${i}` });
    const out = await layoutScene(b.scene, parts);
    for (const a of out.nodes) {
      for (const c of out.nodes) {
        if (a !== c) expect(overlaps(a, c), `${a.id} overlaps ${c.id}`).toBe(false);
      }
    }
    expect(out.edges.every((e) => e.points.length >= 2)).toBe(true);
  });

  it("keeps grouped nodes inside their group", async () => {
    const out = await layoutScene(build("architecture").scene, parts);
    const server = out.groups.find((g) => g.id === "server")!;
    for (const node of out.nodes.filter((n) => n.group === "server")) {
      expect(node.x).toBeGreaterThanOrEqual(server.x);
      expect(node.y).toBeGreaterThanOrEqual(server.y);
      expect(node.x + node.width).toBeLessThanOrEqual(server.x + server.width);
      expect(node.y + node.height).toBeLessThanOrEqual(server.y + server.height);
    }
  });

  it("builds editor links for nodes with files", async () => {
    const out = await layoutScene(build("architecture").scene, parts, { editor: "cursor" });
    expect(out.nodes.find((n) => n.id === "tools")!.link).toBe("cursor://file/repo/src/server.ts");
  });

  it("routes wires from pin to pin", async () => {
    const out = await layoutScene(build("circuit").scene, parts);
    const uno = out.parts.find((p) => p.id === "uno")!;
    const pin13 = uno.pins.find((p) => p.name === "13")!;
    const wire = out.wires.find((w) => w.from.part === "uno")!;
    expect(wire.points[0]).toEqual({ x: uno.x + pin13.x, y: uno.y + pin13.y });
    expect(out.wires).toHaveLength(3);
  });

  it("keeps callout labels clear of parts and of each other", async () => {
    const out = await layoutScene(build("circuit").scene, parts);
    for (const label of out.labels) {
      for (const part of out.parts)
        expect(overlaps(label, part), `${label.id} / ${part.id}`).toBe(false);
      for (const other of out.labels) {
        if (other !== label) expect(overlaps(label, other)).toBe(false);
      }
    }
  });

  it("reserves a header for the title", async () => {
    const out = await layoutScene(build("architecture").scene, parts);
    const top = Math.min(...out.nodes.map((n) => n.y), ...out.groups.map((g) => g.y));
    expect(top).toBeGreaterThan(out.subtitle!.y + out.subtitle!.height);
  });
});
