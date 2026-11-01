import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { sketchShape } from "../src/tools/schemas.js";

// Skill entry: the same scene description as the `sketch` tool in, one
// self-contained HTML page out. Runs in Claude's code sandbox, no network.
const [scenePath, outPath] = process.argv.slice(2);
const parts = await PartIndex.load(new URL("./parts.json", import.meta.url));

// `--parts <query>` searches the part library; an exact type lists its pins.
if (scenePath === "--parts") {
  const query = process.argv.slice(3).join(" ");
  const detail = parts.detail(query.trim());
  if (detail) console.log(`${detail.type}: ${detail.pinList.map((p) => p.name).join(", ")}`);
  else for (const p of parts.search(query)) console.log(`${p.type} — ${p.title} (${p.category})`);
  process.exit(0);
}
if (!scenePath || !outPath) {
  console.error("usage: node render.mjs <scene.json> <out.html> | --parts <query>");
  process.exit(2);
}

try {
  const input = z.object(sketchShape).parse(JSON.parse(readFileSync(scenePath, "utf8")));
  const builder = new SceneBuilder(parts);
  builder.reset({ title: input.title, subtitle: input.subtitle, direction: input.direction });
  for (const g of input.groups ?? []) builder.addGroup(g);
  for (const n of input.nodes ?? []) builder.addNode(n);
  for (const p of input.parts ?? []) builder.addPart(p);
  if (input.images?.length) throw new Error("Photos are not available in the skill.");
  for (const e of input.edges ?? []) builder.addEdge(e);
  for (const w of input.wires ?? []) builder.connect(w);
  for (const l of input.labels ?? []) builder.addLabel(l);
  for (const s of input.steps ?? []) builder.addStep(s);

  const laidOut = await layoutScene(builder.scene, parts);
  const template = readFileSync(new URL("./viewer.html", import.meta.url), "utf8");
  // "<" is escaped so scene text can never close the script element.
  const json = JSON.stringify(laidOut).replace(/</g, "\\u003c");
  const marker = /(<script type="application\/json" id="sketchy-scene">)[\s\S]*?(<\/script>)/;
  writeFileSync(
    outPath,
    template.replace(marker, (_, open, close) => `${open}${json}${close}`),
  );
  console.log(`Wrote ${outPath}`);
} catch (error) {
  // Validation errors name the field so Claude can fix the scene and retry.
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
