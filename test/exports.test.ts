import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { downloadsSink } from "../src/exports.js";
import { PartIndex } from "../src/parts/index.js";
import { createServer } from "../src/server.js";

async function connect(dir?: string): Promise<Client> {
  const server = createServer({
    parts: await PartIndex.load(),
    viewerHtml: () => "<html></html>",
    exports: dir ? downloadsSink(dir) : undefined,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientSide);
  return client;
}

describe("save_export", () => {
  it("writes exports to disk without overwriting or leaving the folder", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sketchy-export-"));
    const client = await connect(dir);
    const save = (args: Record<string, unknown>) =>
      client.callTool({ name: "save_export", arguments: args }) as Promise<CallToolResult>;

    const first = await save({ name: "demo.svg", text: "<svg/>" });
    const second = await save({ name: "../demo.svg", text: "<svg/>" });
    const png = await save({ name: "demo.png", base64: Buffer.from("png").toString("base64") });

    expect(first.structuredContent).toEqual({ path: join(dir, "demo.svg") });
    expect(second.structuredContent).toEqual({ path: join(dir, "demo-2.svg") });
    expect(await readFile(join(dir, "demo.png"), "utf8")).toBe("png");
    expect(png.isError).toBeFalsy();
    expect((await readdir(dir)).sort()).toEqual(["demo-2.svg", "demo.png", "demo.svg"]);
  });

  it("is only offered where exports have a place to go", async () => {
    const { tools } = await (await connect()).listTools();
    expect(tools.map((t) => t.name)).not.toContain("save_export");
  });
});
