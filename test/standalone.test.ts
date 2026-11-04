import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { PartIndex } from "../src/parts/index.js";
import type { LaidOutScene } from "../src/scene/laid-out.js";
import { createServer } from "../src/server.js";
import { embedScene, standaloneFiles } from "../src/standalone.js";

const UI = {
  extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } },
};

async function sketch(
  withViewer: boolean,
  dir: string,
  terminal = false,
): Promise<{ text: string; saved: string[] }> {
  const saved: string[] = [];
  const save = standaloneFiles(dir);
  const server = createServer({
    parts: await PartIndex.load(),
    viewerHtml: () => "<html></html>",
    compact: true,
    terminal,
    standalone: async (scene) => {
      const path = await save(scene);
      saved.push(path);
      return path;
    },
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client(
    { name: "test", version: "1.0.0" },
    { capabilities: withViewer ? (UI as never) : {} },
  );
  await client.connect(clientSide);
  const result = (await client.callTool({
    name: "sketch",
    arguments: { scene: "title Web request\nbrowser Browser\nserver Server\nbrowser -> server" },
  })) as CallToolResult;
  return { text: (result.content[0] as { text: string }).text, saved };
}

describe("clients without MCP Apps", () => {
  it("get the drawing as an HTML file and an honest reply", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sketchy-standalone-"));
    const { text, saved } = await sketch(false, dir);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.startsWith(dir)).toBe(true);
    expect(saved[0]).toMatch(/web-request-.*\.html$/);
    expect(text).toContain("Inline display isn't supported in this client");
    expect(text).toContain(saved[0]!);
    expect(text).not.toContain("now sees the drawing");
    const html = await readFile(saved[0]!, "utf8");
    expect(html).toContain('"Web request"');
  });

  it("leaves clients with MCP Apps as they were", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sketchy-standalone-"));
    const { text, saved } = await sketch(true, dir);
    expect(saved).toEqual([]);
    expect(text).toContain("The user now sees the drawing");
    expect(await readdir(dir)).toEqual([]);
  });

  it("saves no file when the Claude Code plugin draws in the terminal", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sketchy-standalone-"));
    const { text, saved } = await sketch(false, dir, true);
    expect(saved).toEqual([]);
    expect(text).toContain("The user now sees the drawing in the terminal");
  });

  it("never lets scene text close the embedded script", () => {
    const template = '<script type="application/json" id="sketchy-scene">null</script>';
    const scene = { kind: "scene", title: { lines: ["</script><b>x"] } } as unknown as LaidOutScene;
    const html = embedScene(template, scene);
    expect(html).not.toContain("</script><b>");
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });
});
