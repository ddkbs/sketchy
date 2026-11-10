import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it } from "vitest";
import { PartIndex } from "../src/parts/index.js";
import type { LaidOutScene } from "../src/scene/laid-out.js";
import { SCENE_META_KEY, VIEWER_URI, createServer } from "../src/server.js";

let client: Client;

beforeEach(async () => {
  const server = createServer({ parts: await PartIndex.load(), viewerHtml: () => "<html></html>" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientSide);
});

const call = (name: string, args: Record<string, unknown> = {}) =>
  client.callTool({ name, arguments: args }) as Promise<CallToolResult>;

const textOf = (r: CallToolResult) => (r.content[0] as { text: string }).text;

describe("server", () => {
  it("links render tools to the viewer resource", async () => {
    const { tools } = await client.listTools();
    const sketch = tools.find((t) => t.name === "sketch")!;
    expect((sketch._meta as { ui: { resourceUri: string } }).ui.resourceUri).toBe(VIEWER_URI);
    const resource = await client.readResource({ uri: VIEWER_URI });
    expect(resource.contents[0]!.mimeType).toContain("mcp-app");
  });

  it("draws a scene in one call and keeps geometry out of the text", async () => {
    const result = await call("sketch", {
      title: "Demo",
      nodes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      edges: [{ from: "a", to: "b" }],
      steps: [{ title: "Go", highlight: ["a", "a->b"] }],
    });
    expect(result.isError).toBeFalsy();
    const scene = result._meta![SCENE_META_KEY] as LaidOutScene;
    expect(scene.nodes).toHaveLength(2);
    expect(textOf(result)).not.toContain("points");
  });

  it("builds a scene incrementally", async () => {
    await call("new_scene", { title: "Wiring" });
    expect(textOf(await call("place_part", { id: "uno", type: "arduino-uno" }))).toContain("Pins:");
    await call("place_part", { id: "led", type: "led" });
    expect((await call("connect", { from: "uno.D13", to: "led.anode" })).isError).toBeFalsy();
    const result = await call("render");
    expect((result._meta![SCENE_META_KEY] as LaidOutScene).wires).toHaveLength(1);
  });

  it("serves the scene by view id for hosts that strip _meta", async () => {
    const result = await call("sketch", { nodes: [{ id: "a", label: "A", icon: "database" }] });
    const { view } = result.structuredContent as { view: string };
    expect((result.structuredContent as { message: string }).message).toMatch(
      /^(Rendered|Laid out)/,
    );
    const fetched = await call("get_view", { view });
    expect((fetched.structuredContent as unknown as LaidOutScene).kind).toBe("scene");
    expect((await call("get_view", { view: "gone" })).isError).toBe(true);
  });

  it("reports helpful errors", async () => {
    await call("new_scene");
    const unknownPart = await call("place_part", { id: "x", type: "arduino uno" });
    expect(unknownPart.isError).toBe(true);
    expect(textOf(unknownPart)).toContain("arduino-uno");
    await call("place_part", { id: "uno", type: "arduino-uno" });
    const badPin = await call("label", { target: "uno", anchor: "D99", text: "?" });
    expect(textOf(badPin)).toContain("Pins:");
    const badEdge = await call("add_edge", { from: "uno", to: "nowhere" });
    expect(badEdge.isError).toBe(true);
  });

  it("offers explanation patterns as prompts", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(
      expect.arrayContaining(["explain-structure", "explain-flow", "compare", "metaphor"]),
    );
  });
});

describe("edit_sketch", () => {
  let compact: Client;

  beforeEach(async () => {
    const server = createServer({
      parts: await PartIndex.load(),
      viewerHtml: () => "<html></html>",
      compact: true,
    });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    compact = new Client({ name: "test", version: "1.0.0" });
    await compact.connect(clientSide);
  });

  const callCompact = (name: string, args: Record<string, unknown>) =>
    compact.callTool({ name, arguments: args }) as Promise<CallToolResult>;
  const sceneOf = (r: CallToolResult) => r._meta![SCENE_META_KEY] as LaidOutScene;

  it("asks for a whole scene when there is nothing to change", async () => {
    const result = await callCompact("edit_sketch", { changes: "a Alpha" });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/Call sketch/);
  });

  it("changes the last drawing and builds on its own edits", async () => {
    await callCompact("sketch", { scene: "title Demo\na Alpha\nb Beta\na -> b" });
    const first = await callCompact("edit_sketch", {
      changes: "b Better !accent\nc Gamma\nb -> c",
    });
    expect(
      sceneOf(first)
        .nodes.map((n) => n.label)
        .sort(),
    ).toEqual(["Alpha", "Better", "Gamma"]);
    expect(sceneOf(first).title?.lines).toEqual(["Demo"]);
    const second = await callCompact("edit_sketch", { changes: "remove a" });
    expect(
      sceneOf(second)
        .nodes.map((n) => n.label)
        .sort(),
    ).toEqual(["Better", "Gamma"]);
    expect(sceneOf(second).edges).toHaveLength(1);
  });

  it("keeps the drawing when an edit fails", async () => {
    await callCompact("sketch", { scene: "a Alpha\nb Beta" });
    expect((await callCompact("edit_sketch", { changes: "remove nope" })).isError).toBe(true);
    expect((await callCompact("edit_sketch", { changes: "a -> ghost" })).isError).toBe(true);
    const ok = await callCompact("edit_sketch", { changes: "a Changed" });
    expect(sceneOf(ok).nodes).toHaveLength(2);
    expect(sceneOf(ok).edges).toHaveLength(0);
  });

  it("documents the drawing blocks in the tool description", async () => {
    const { tools } = await compact.listTools();
    const description = tools.find((t) => t.name === "sketch")!.description!;
    expect(description).toMatch(/object <type>/);
    expect(description).toMatch(/person, tree/);
    expect(description).toMatch(/timeline\|cycle/);
    expect(tools.some((t) => t.name === "edit_sketch")).toBe(true);
  });
});
