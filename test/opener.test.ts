import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { editorLink } from "../src/layout/links.js";
import { isEditorLink } from "../src/opener.js";
import { PartIndex } from "../src/parts/index.js";
import { createServer } from "../src/server.js";

describe("open_link", () => {
  it("accepts only the editor links Sketchy builds", () => {
    expect(isEditorLink(editorLink("/repo/src/server.ts", 12, "cursor"))).toBe(true);
    expect(isEditorLink(editorLink("C:\\repo\\a b.ts", undefined, "vscode"))).toBe(true);
    expect(isEditorLink("https://example.com")).toBe(false);
    expect(isEditorLink("file:///etc/passwd")).toBe(false);
    expect(isEditorLink("cursor://file/a b")).toBe(false);
    expect(isEditorLink("vscode://settings/x")).toBe(false);
  });

  it("opens file links through the local opener and refuses others", async () => {
    const opened: string[] = [];
    const server = createServer({
      parts: await PartIndex.load(),
      viewerHtml: () => "<html></html>",
      opener: async (url) => void opened.push(url),
    });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientSide);
    const open = (url: string) =>
      client.callTool({ name: "open_link", arguments: { url } }) as Promise<CallToolResult>;

    const link = editorLink("/repo/src/server.ts", undefined, "cursor");
    expect((await open(link)).isError).toBeFalsy();
    expect((await open("https://example.com")).isError).toBe(true);
    expect(opened).toEqual([link]);
  });
});
