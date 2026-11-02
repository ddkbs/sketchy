// Compares token usage of a plain-text explanation with a Sketchy drawing.
// Each topic is asked twice through `claude -p`: once text only, once with
// the Sketchy MCP server, which Claude Code reports as exact usage.
//
//   npm run build && node scripts/token-benchmark.mjs [--model sonnet] [--runs 2]
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    model: { type: "string", default: "sonnet" },
    runs: { type: "string", default: "2" },
  },
});

const TOPICS = [
  "how DNS resolves a domain name",
  "how git branches and merges work",
  "how a transformer language model generates text",
  "how the TLS handshake secures an HTTPS connection",
  "how an Arduino reads a push button and lights an LED",
];

// An empty working directory and a strict MCP config keep the user's own
// project files, settings and servers out of the measurement.
const cwd = mkdtempSync(join(tmpdir(), "sketchy-bench-"));
const mcpConfig = join(cwd, "mcp.json");
const server = new URL("../dist/index.js", import.meta.url).pathname;
writeFileSync(
  mcpConfig,
  JSON.stringify({
    mcpServers: {
      sketchy: { command: "node", args: [server], env: { SKETCHY_PHOTOS: "off" } },
    },
  }),
);

function ask(prompt, withSketchy) {
  const args = ["-p", prompt, "--output-format", "json", "--model", values.model];
  args.push("--setting-sources", "project", "--strict-mcp-config");
  if (withSketchy) {
    args.push("--mcp-config", mcpConfig);
    args.push("--allowedTools", "mcp__sketchy__sketch,mcp__sketchy__search_parts");
  }
  const out = JSON.parse(execFileSync("claude", args, { cwd, encoding: "utf8" }));
  const u = out.usage;
  // Cache reads are re-sent context billed at a tenth; keep them apart.
  return {
    input: u.input_tokens + u.cache_creation_input_tokens,
    cached: u.cache_read_input_tokens,
    output: u.output_tokens,
    turns: out.num_turns,
  };
}

const average = (list, key) => Math.round(list.reduce((s, r) => s + r[key], 0) / list.length);

const rows = [];
for (const topic of TOPICS) {
  const text = [];
  const drawn = [];
  for (let i = 0; i < Number(values.runs); i++) {
    text.push(ask(`Explain ${topic}. Answer in plain text only.`, false));
    drawn.push(
      ask(
        `Explain ${topic}. Draw it with the Sketchy sketch tool, then explain it in 2-4 sentences.`,
        true,
      ),
    );
  }
  const row = {
    topic,
    textOutput: average(text, "output"),
    sketchOutput: average(drawn, "output"),
    textInput: average(text, "input"),
    sketchInput: average(drawn, "input"),
    textCached: average(text, "cached"),
    sketchCached: average(drawn, "cached"),
  };
  rows.push(row);
  console.error(`done: ${topic}`);
}
console.log(JSON.stringify({ model: values.model, runs: Number(values.runs), rows }, null, 2));
