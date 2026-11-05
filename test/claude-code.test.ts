import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { draw, type Cells } from "../claude-code/hooks/draw.js";
import { find, isScene, slim } from "../claude-code/hooks/scene.js";
import type { Sketch } from "../claude-code/types/index.js";
import { PartIndex } from "../src/parts/index.js";
import { createServer } from "../src/server.js";
import { terminalFiles, type TerminalFiles } from "../src/terminal.js";

const SCENE = `title How Sketchy works
dir right
user You (person)
claude Claude
group srv Sketchy MCP server
scene Scene text in srv
layout Auto-layout in srv !accent
render Hand-drawn renderer in srv
viewer Sketch shown inline
user -> claude question
claude -> scene sketch tool
scene -> layout
layout -> render
render -> viewer
viewer --> user sees it
step Ask: You ask Claude | user, claude, user->claude
step Place: Sketchy lays it out | layout, render, scene->layout`;

const ACCENT_BG = 0xffe066;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Lays the scene out with the real server and reads it the way the plugin
 * does: the files named in the result's `terminal` entry.
 */
async function layout(scene: string): Promise<{ sketch: Sketch; files: TerminalFiles }> {
  const dir = await mkdtemp(join(tmpdir(), "sketchy-terminal-"));
  const server = createServer({
    parts: await PartIndex.load(),
    viewerHtml: () => "<html></html>",
    compact: true,
    terminal: terminalFiles(dir),
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "claude-code", version: "1.0.0" });
  await client.connect(clientSide);
  const result = await client.callTool({ name: "sketch", arguments: { scene } });
  const files = (result.structuredContent as { terminal: TerminalFiles }).terminal;
  expect(files.scene.startsWith(dir)).toBe(true);
  const found = find(JSON.parse(await readFile(files.scene, "utf8")), isScene);
  expect(found).toBeDefined();
  return { sketch: slim(found as Record<string, unknown>), files };
}

function decode(cells: Cells): { text: string[]; bg: number[][] } {
  const bytes = Buffer.from(cells.data, "base64");
  const words = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
  expect(words.length).toBe(cells.columns * cells.rows * 3);
  const text: string[] = [];
  const bg: number[][] = [];
  for (let y = 0; y < cells.rows; y++) {
    let line = "";
    const row: number[] = [];
    for (let x = 0; x < cells.columns; x++) {
      const i = (y * cells.columns + x) * 3;
      line += String.fromCodePoint(words[i]!);
      row.push(words[i + 2]!);
    }
    text.push(line);
    bg.push(row);
  }
  return { text, bg };
}

describe("Claude Code terminal renderer", () => {
  let sketch: Sketch;
  let files: TerminalFiles;
  beforeAll(async () => {
    ({ sketch, files } = await layout(SCENE));
  });

  it("renders a picture of the whole drawing and of every step", async () => {
    expect(files.images).toHaveLength(3);
    for (const image of files.images) {
      const png = await readFile(image);
      expect(png.subarray(0, 4).equals(PNG)).toBe(true);
      // Width in the PNG header: twice the scene for high-density screens.
      expect(png.readUInt32BE(16)).toBe(files.width * 2);
    }
  });

  it("reads the laid-out scene from the tool result", () => {
    expect(sketch.title).toBe("How Sketchy works");
    expect(sketch.nodes.map((n) => n.id)).toContain("layout");
    expect(sketch.groups[0]?.label).toBe("Sketchy MCP server");
    expect(sketch.steps).toHaveLength(2);
    expect(sketch.edges.find((e) => e.from === "viewer")?.dashed).toBe(true);
  });

  it("draws every label, the group and arrowheads within the width", () => {
    const cells = draw(sketch, 120, -1);
    expect(cells.columns).toBeLessThanOrEqual(120);
    const all = decode(cells).text.join("\n");
    for (const label of [
      "Claude",
      "You",
      "Scene text",
      "Auto-layout",
      "Hand-drawn",
      "renderer",
      "Sketch",
      "inline",
      "Sketchy MCP server",
      "question",
      "sees it",
    ]) {
      expect(all).toContain(label);
    }
    expect(all).toMatch(/[▶◀▲▼]/);
    expect(all).toContain("╌");
  });

  it("wraps labels instead of cutting them when the terminal is narrow", () => {
    const cells = draw(sketch, 80, -1);
    expect(cells.columns).toBeLessThanOrEqual(80);
    const all = decode(cells).text.join("\n");
    expect(all).toContain("Hand-drawn");
    expect(all).toContain("renderer");
    expect(all).not.toContain("…");
  });

  it("fills accent boxes, and in a step only the highlighted ones", () => {
    const filled = (cells: Cells) =>
      decode(cells)
        .bg.flat()
        .filter((c) => c === ACCENT_BG).length;
    const overview = filled(draw(sketch, 120, -1));
    expect(overview).toBeGreaterThan(0);
    const ask = decode(draw(sketch, 120, 0));
    const backgroundOf = (label: string) => {
      const y = ask.text.findIndex((line) => line.includes(label));
      return ask.bg[y]![[...ask.text[y]!].join("").indexOf(label)];
    };
    expect(backgroundOf("Claude")).toBe(ACCENT_BG);
    expect(backgroundOf("Auto-layout")).not.toBe(ACCENT_BG);
  });
});
