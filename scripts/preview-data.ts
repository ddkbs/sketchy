// Lays out the test fixtures so the viewer preview page can render them.
import { mkdirSync, writeFileSync } from "node:fs";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { SAMPLES } from "../test/fixtures.js";

const parts = await PartIndex.load();
const out: Record<string, unknown> = {};
for (const [name, fill] of Object.entries(SAMPLES)) {
  const builder = new SceneBuilder(parts);
  fill(builder);
  out[name] = await layoutScene(builder.scene, parts, { editor: "vscode" });
}
mkdirSync(new URL("../build/preview/", import.meta.url), { recursive: true });
writeFileSync(new URL("../build/preview/samples.json", import.meta.url), JSON.stringify(out));
console.error(`preview-data: wrote ${Object.keys(out).length} samples`);
