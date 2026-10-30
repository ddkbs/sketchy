import { beforeAll, describe, expect, it } from "vitest";
import { PartIndex } from "../src/parts/index.js";

let parts: PartIndex;
beforeAll(async () => {
  parts = await PartIndex.load();
});

describe("PartIndex", () => {
  it("finds parts by keywords", () => {
    expect(parts.search("distance sensor")[0]!.type).toBe("hc-sr04");
    expect(parts.search("uno")[0]!.type).toBe("arduino-uno");
    expect(parts.search("oled").map((p) => p.type)).toContain("ssd1306");
  });

  it("resolves the pin names used in sketches", () => {
    expect(parts.resolvePin("arduino-uno", "D13")!.name).toBe("13");
    expect(parts.resolvePin("arduino-uno", "13")!.name).toBe("13");
    expect(parts.resolvePin("arduino-uno", "GND")!.name).toBe("GND.1");
    expect(parts.resolvePin("arduino-uno", "a0")!.name).toBe("A0");
    expect(parts.resolvePin("led", "anode")!.name).toBe("A");
    expect(parts.resolvePin("led", "-")!.name).toBe("C");
    expect(parts.resolvePin("arduino-uno", "D99")).toBeUndefined();
  });

  it("serves visual variants", () => {
    expect(parts.svg("led", { color: "green" })).not.toBe(parts.svg("led", { color: "red" }));
    expect(parts.svg("led", { unknown: "x" })).toBe(parts.svg("led"));
  });

  it("extracts parseable SVG for every part", () => {
    for (const part of parts.search("", 100)) {
      const svg = parts.svg(part.type);
      expect(svg.startsWith("<svg"), part.type).toBe(true);
      expect(/&(?!#\d+;|amp;|lt;|gt;|quot;|apos;)/.test(svg), part.type).toBe(false);
    }
  });
});
