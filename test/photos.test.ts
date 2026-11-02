import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchText, parseLocBoxes } from "../src/photos/grounding.js";
import { unavailableReason } from "../src/photos/models.js";
import { normalizeLicense, stripHtml } from "../src/photos/search.js";
import { LocalDatabase } from "../src/storage/database.js";

describe("normalizeLicense", () => {
  it("accepts reusable licenses", () => {
    expect(normalizeLicense("CC0")).toBe("CC0");
    expect(normalizeLicense("Public domain")).toBe("Public domain");
    expect(normalizeLicense("CC BY 2.0")).toBe("CC BY 2.0");
    expect(normalizeLicense("CC BY-SA 4.0")).toBe("CC BY-SA 4.0");
    expect(normalizeLicense("cc by-sa 3.0")).toBe("CC BY-SA 3.0");
  });

  it("rejects non-commercial, no-derivatives and unknown licenses", () => {
    expect(normalizeLicense("CC BY-NC 4.0")).toBeUndefined();
    expect(normalizeLicense("CC BY-ND 2.0")).toBeUndefined();
    expect(normalizeLicense("GFDL")).toBeUndefined();
  });
});

describe("stripHtml", () => {
  it("keeps the author name from Commons markup", () => {
    expect(stripHtml('<a href="//commons.wikimedia.org/wiki/User:X">Jane &amp; Co</a>')).toBe(
      "Jane & Co",
    );
  });
});

describe("parseLocBoxes", () => {
  it("converts Florence location bins to pixels", () => {
    const [box] = parseLocBoxes("red button<loc_0><loc_0><loc_499><loc_999>", [1000, 500]);
    expect(box).toEqual([0.5, 0.25, 499.5, 499.75]);
  });
});

describe("matchText", () => {
  const lines = [
    { text: "POWER", box: [1, 2, 3, 4] as [number, number, number, number] },
    { text: "RX TX 5V GND", box: [5, 6, 7, 8] as [number, number, number, number] },
  ];
  it("matches whole lines and tokens, ignoring case", () => {
    expect(matchText("power", lines)).toEqual([1, 2, 3, 4]);
    expect(matchText("GND", lines)).toEqual([5, 6, 7, 8]);
    expect(matchText("G", lines)).toBeUndefined();
    expect(matchText("USB port", lines)).toBeUndefined();
  });
});

describe("LocalDatabase", () => {
  it("persists settings across reopen", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sketchy-"));
    const first = await LocalDatabase.open(dir);
    first.setSetting("photo.model", "small");
    const second = await LocalDatabase.open(dir);
    expect(second.getSetting("photo.model")).toBe("small");
    expect(second.getSetting("missing")).toBeUndefined();
  });
});

describe("model availability", () => {
  it("offers only the small model inside Electron", () => {
    const electron = { ...process.versions, electron: "41.0.0" };
    const node = { ...process.versions, electron: undefined } as NodeJS.ProcessVersions;
    expect(unavailableReason("small", electron)).toBeUndefined();
    expect(unavailableReason("medium", electron)).toMatch(/Claude app/);
    expect(unavailableReason("large", electron)).toMatch(/Claude app/);
    expect(unavailableReason("large", node)).toBeUndefined();
  });
});
