// Lays out the demo scenes with the real Sketchy server (run `npm run build` in the repo root first).
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = new URL("../../", import.meta.url);
const input = JSON.parse(readFileSync(new URL("./scenes.input.json", import.meta.url), "utf8"));

const client = new Client({ name: "sketchy-website", version: "0.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: [new URL("dist/index.js", root).pathname],
    env: { ...process.env, SKETCHY_PHOTOS: "off" },
    stderr: "ignore",
  }),
);

const out = {};
for (const [name, args] of Object.entries(input)) {
  const started = performance.now();
  const result = await client.callTool({ name: "sketch", arguments: args });
  if (result.isError) throw new Error(`${name}: ${result.content[0].text}`);
  const scene = result._meta["sketchy/scene"];
  out[name] = { args, scene, ms: Math.round(performance.now() - started) };
  console.log(`${name}: ${Math.round(scene.width)}×${Math.round(scene.height)}`);
}
await client.close();
writeFileSync(new URL("../src/demo/scenes.json", import.meta.url), JSON.stringify(out));
