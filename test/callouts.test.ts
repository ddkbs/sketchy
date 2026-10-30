import { describe, expect, it } from "vitest";
import { planCallouts, stack } from "../src/layout/callouts.js";
import { wrapText } from "../src/layout/text.js";

describe("planCallouts", () => {
  it("puts labels beside the side of their anchor and reserves room", () => {
    const plan = planCallouts(200, 100, [
      { id: "l", text: "left thing", anchor: { x: 10, y: 50 } },
      { id: "r", text: "right thing", anchor: { x: 190, y: 50 } },
    ]);
    const left = plan.callouts.find((c) => c.id === "l")!;
    const right = plan.callouts.find((c) => c.id === "r")!;
    expect(left.x + left.width).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(200);
    expect(plan.margins.left).toBeGreaterThanOrEqual(-left.x);
    expect(plan.margins.right).toBeGreaterThanOrEqual(right.x + right.width - 200);
  });

  it("keeps the vertical order of anchors so leaders do not cross", () => {
    const plan = planCallouts(100, 100, [
      { id: "b", text: "bottom", anchor: { x: 90, y: 90 } },
      { id: "a", text: "top", anchor: { x: 90, y: 10 } },
    ]);
    const a = plan.callouts.find((c) => c.id === "a")!;
    const b = plan.callouts.find((c) => c.id === "b")!;
    expect(a.y + a.height).toBeLessThanOrEqual(b.y);
  });
});

describe("stack", () => {
  it("separates overlapping boxes", () => {
    const tops = stack(
      [
        { center: 10, size: 20 },
        { center: 12, size: 20 },
        { center: 14, size: 20 },
      ],
      5,
    );
    expect(tops[1]! - tops[0]!).toBeGreaterThanOrEqual(25);
    expect(tops[2]! - tops[1]!).toBeGreaterThanOrEqual(25);
  });
});

describe("wrapText", () => {
  it("wraps at the width and breaks long words", () => {
    expect(wrapText("one two three four", 18, 60).length).toBeGreaterThan(1);
    expect(wrapText("supercalifragilistic", 18, 50).every((l) => l.length > 0)).toBe(true);
    expect(wrapText("a\nb", 18, 500)).toEqual(["a", "b"]);
  });
});
