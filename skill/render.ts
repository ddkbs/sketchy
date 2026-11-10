import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { parseCompact } from "../src/scene/compact.js";
import { fillScene, type SketchInput } from "../src/scene/fill.js";
import { embedScene } from "../src/standalone.js";
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
  // A .json file holds the JSON form; anything else is the compact line syntax.
  const source = readFileSync(scenePath, "utf8");
  // The line syntax is checked by its parser and carries what the JSON schema
  // leaves out (figures, the values steps assign), so only JSON goes through zod.
  const input: SketchInput = scenePath.endsWith(".json")
    ? z.object(sketchShape).parse(JSON.parse(source))
    : parseCompact(source);
  if (input.images?.length) throw new Error("Photos are not available in the skill.");
  const builder = new SceneBuilder(parts);
  await fillScene(builder, input);

  const laidOut = await layoutScene(builder.scene, parts);
  const template = readFileSync(new URL("./viewer.html", import.meta.url), "utf8");
  writeFileSync(outPath, embedScene(template, laidOut));
  console.log(`Wrote ${outPath}`);
} catch (error) {
  // Validation errors name the field so Claude can fix the scene and retry.
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
