import { describe, expect, it } from "vitest";
import { layoutFigure } from "../src/figures/index.js";
import { findCountry, regionBox } from "../src/figures/map.js";
import { parseSmiles } from "../src/figures/molecule.js";
import type { MapSpec, Primitive } from "../src/figures/types.js";
import { parseCompact } from "../src/scene/compact.js";

const texts = (prims: Primitive[]) => prims.filter((p) => p.t === "text").map((p) => (p as { text: string }).text);
const figure = (source: string) => parseCompact(source).figures[0]!;

describe("molecules", () => {
  it("reads SMILES with branches, rings, charges and parts", () => {
    expect(parseSmiles("CC(=O)O").bonds.map((b) => b.order)).toEqual([1, 2, 1]);
    expect(parseSmiles("c1ccccc1").bonds.filter((b) => b.order === 1.5)).toHaveLength(6);
    expect(parseSmiles("[NH4+].[Cl-]").atoms.map((a) => [a.el, a.charge])).toEqual([
      ["N", 1],
      ["Cl", -1],
    ]);
    expect(() => parseSmiles("C1CC")).toThrow(/ring 1 is never closed/);
    expect(() => parseSmiles("C(C")).toThrow(/without/);
  });

  it("writes hetero atoms with their hydrogens and skips plain carbons", () => {
    const at = (smiles: string, extra = "") => texts(layoutFigure(figure(`molecule m ${smiles}${extra}`)).prims);
    expect(at("CCO")).toEqual(["OH"]);
    expect(at("O")).toEqual(["H₂O"]);
    expect(at("C")).toEqual(["CH₄"]);
    expect(at("CC", " full")).toEqual(["H₃C", "CH₃"]);
    expect(at("[NH4+]")).toEqual(["NH₄⁺"]);
  });

  it("draws a ring's double bonds inside it and aromatic rings with a circle", () => {
    const lines = (smiles: string) => layoutFigure(figure(`molecule m ${smiles}`)).prims.filter((p) => p.t === "line");
    expect(lines("C1=CC=CC=C1")).toHaveLength(9);
    const benzene = layoutFigure(figure("molecule m c1ccccc1")).prims;
    expect(benzene.filter((p) => p.t === "ellipse")).toHaveLength(1);
  });

  it("rejects bad SMILES at parse time and lets steps circle atoms", () => {
    expect(() => parseCompact("molecule m C1CC")).toThrow(/never closed/);
    const scene = parseCompact("molecule m CCO : Ethanol\nstep OH: The group | m[3]");
    expect(scene.figures[0]!.title).toBe("Ethanol");
    expect(layoutFigure(scene.figures[0]!).prims.some((p) => p.key === "m[3]")).toBe(true);
  });
});

describe("maps", () => {
  it("finds countries by short, long and common names", () => {
    expect(findCountry("Germany")?.properties.name).toBe("Germany");
    expect(findCountry("USA")?.properties.name).toBe("United States of America");
    expect(findCountry("Democratic Republic of the Congo")?.properties.name).toBe("Dem. Rep. Congo");
    expect(findCountry("Bosnia and Herzegovina")?.properties.name).toBe("Bosnia and Herz.");
    expect(regionBox("europe")).toBeDefined();
    expect(regionBox("Japan")).toBeDefined();
    expect(regionBox("Narnia")).toBeUndefined();
  });

  it("reads countries, places and routes", () => {
    const fig = figure(
      [
        "map m europe: Trains",
        "Germany !accent ~ Start",
        "United Kingdom hatch=blue",
        "place berlin 52.52,13.40 Berlin !accent",
        "place paris 48.86,2.35 Paris",
        "route r: berlin -> paris --dashed ~ 8 h",
      ].join("\n"),
    );
    const spec = fig.spec as MapSpec;
    expect(spec.countries.map((c) => c.name)).toEqual(["Germany", "United Kingdom"]);
    expect(spec.routes[0]).toMatchObject({ from: [52.52, 13.4], to: [48.86, 2.35], dashed: true, name: "r", label: "8 h" });
    const prims = layoutFigure(fig).prims;
    expect(prims.some((p) => p.key === "m[Germany]")).toBe(true);
    expect(prims.some((p) => p.key === "m[United-Kingdom]")).toBe(true);
    expect(texts(prims)).toEqual(expect.arrayContaining(["Trains", "Start", "Berlin", "Paris", "8 h"]));
  });

  it("explains unknown countries, regions and places", () => {
    expect(() => parseCompact("map m\nGermny")).toThrow(/did you mean Germany/);
    expect(() => parseCompact("map m mars")).toThrow(/unknown map region/);
    expect(() => parseCompact("map m\nroute a -> b")).toThrow(/no place "a"/);
  });
});
