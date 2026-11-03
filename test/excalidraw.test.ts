import { beforeAll, describe, expect, it } from "vitest";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { toExcalidraw, WATERMARK } from "../viewer/src/excalidraw.js";
import { SAMPLES } from "./fixtures.js";

type Element = Record<string, unknown> & { id: string; type: string };
type File = {
  type: string;
  version: number;
  elements: Element[];
  files: Record<string, { mimeType: string; dataURL: string }>;
};

let parts: PartIndex;
beforeAll(async () => {
  parts = await PartIndex.load();
});

async function convert(sample: keyof typeof SAMPLES): Promise<File> {
  const builder = new SceneBuilder(parts);
  SAMPLES[sample]!(builder);
  return JSON.parse(toExcalidraw(await layoutScene(builder.scene, parts), 0)) as File;
}

describe("toExcalidraw", () => {
  it("writes a valid Excalidraw document with unique ids", async () => {
    const file = await convert("architecture");
    expect(file.type).toBe("excalidraw");
    expect(file.version).toBe(2);
    const ids = file.elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("binds labels and arrows to the shapes they belong to", async () => {
    const { elements } = await convert("architecture");
    const byId = new Map(elements.map((e) => [e.id, e]));
    for (const e of elements) {
      if (e.type === "text" && e.containerId) {
        const container = byId.get(e.containerId as string)!;
        expect(container.boundElements).toContainEqual({ type: "text", id: e.id });
      }
      if (e.type === "arrow") {
        for (const end of ["startBinding", "endBinding"]) {
          const binding = e[end] as { elementId: string } | null;
          if (binding)
            expect(byId.get(binding.elementId)!.boundElements).toContainEqual({
              type: "arrow",
              id: e.id,
            });
        }
        const points = e.points as number[][];
        expect(points[0]).toEqual([0, 0]);
        expect(points.length).toBeGreaterThanOrEqual(2);
      }
    }
    expect(elements.some((e) => e.type === "arrow")).toBe(true);
    expect(elements.some((e) => e.type === "text" && e.text === "Layout engine")).toBe(true);
  });

  it("embeds circuit parts as images with their files", async () => {
    const file = await convert("circuit");
    const images = file.elements.filter((e) => e.type === "image");
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      const data = file.files[image.fileId as string]!;
      expect(data.mimeType).toBe("image/svg+xml");
      expect(data.dataURL).toMatch(/^data:image\/svg\+xml;base64,/);
    }
    expect(file.elements.some((e) => e.type === "line")).toBe(true);
  });

  it("signs the drawing with a faint watermark", async () => {
    const { elements } = await convert("comparison");
    const mark = elements.find((e) => e.text === WATERMARK)!;
    expect(mark.opacity).toBeLessThan(50);
  });
});
