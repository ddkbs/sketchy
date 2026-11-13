// Lays out the demo scenes with the real Sketchy server (run `npm run build` in the repo root
// first). Each scene is written in the compact syntax, exactly what Claude sends; a photo scene
// first finds and locates its photo with the local vision model, as Claude would.
// Output: public/scenes/<name>.json, loaded by the page only when a chat turn needs it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = new URL("../../", import.meta.url);
const input = JSON.parse(readFileSync(new URL("./scenes.input.json", import.meta.url), "utf8"));
const only = process.argv.slice(2);
const out = new URL("../public/scenes/", import.meta.url);
mkdirSync(out, { recursive: true });

const client = new Client({ name: "sketchy-website", version: "0.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: [new URL("dist/index.js", root).pathname],
    env: { ...process.env, SKETCHY_FORMAT: "compact" },
    stderr: "ignore",
  }),
);

const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name}: ${result.content[0].text}`);
  return result;
};

for (const [name, entry] of Object.entries(input)) {
  if (only.length && !only.includes(name)) continue;
  let text = typeof entry === "string" ? entry : entry.scene;
  if (entry.photo) {
    const { query, image, locate } = entry.photo;
    await call("find_image", { query });
    const found = await call("locate", { image, queries: locate });
    console.log(`${name}: ${found.content[0].text.split("\n").slice(0, -1).join(", ")}`);
    text = text.replaceAll("{image}", image);
  }
  const started = performance.now();
  const result = await call("sketch", { scene: text });
  const scene = result._meta["sketchy/scene"];
  const ms = Math.round(performance.now() - started);
  writeFileSync(new URL(`${name}.json`, out), JSON.stringify({ input: text, scene, ms }));
  console.log(`${name}: ${Math.round(scene.width)}×${Math.round(scene.height)}, ${ms} ms`);
}
await client.close();
