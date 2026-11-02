import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { layoutScene, previousLayout } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder, SceneError } from "../src/scene/builder.js";
import { parseCompact } from "../src/scene/compact.js";
import { createServer } from "../src/server.js";

describe("compact scene syntax", () => {
  it("parses every element kind", () => {
    const scene = parseCompact(`
      title How DNS works
      subtitle From name to address
      dir right
      group net The internet
      browser Browser @globe (person) ~ You type a name
      dns DNS resolver @server in net !accent ~ Finds the IP
      db Records (cylinder) in net !muted
      browser -> dns lookup
      dns --> db cache miss !muted
      dns <-> browser
      label db Postgres
      step Ask: The browser asks | browser, dns browser->dns
      part led1 led color=red Status LED
      wire uno.13 -> led1.A green
      image img-1
      label img-1.round A button: A button
    `);
    expect(scene.title).toBe("How DNS works");
    expect(scene.subtitle).toBe("From name to address");
    expect(scene.direction).toBe("right");
    expect(scene.groups).toEqual([{ id: "net", label: "The internet" }]);
    expect(scene.nodes).toEqual([
      {
        id: "browser",
        label: "Browser",
        icon: "lucide:globe",
        shape: "person",
        description: "You type a name",
      },
      {
        id: "dns",
        label: "DNS resolver",
        icon: "lucide:server",
        group: "net",
        tone: "accent",
        description: "Finds the IP",
      },
      { id: "db", label: "Records", shape: "cylinder", group: "net", tone: "muted" },
    ]);
    expect(scene.edges).toEqual([
      { from: "browser", to: "dns", label: "lookup" },
      { from: "dns", to: "db", label: "cache miss", style: "dashed", tone: "muted" },
      { from: "dns", to: "browser", bidirectional: true },
    ]);
    expect(scene.labels).toEqual([
      { target: "db", text: "Postgres" },
      { target: "img-1", anchor: "round A button", text: "A button" },
    ]);
    expect(scene.steps).toEqual([
      { title: "Ask", text: "The browser asks", highlight: ["browser", "dns", "browser->dns"] },
    ]);
    expect(scene.parts).toEqual([
      { id: "led1", type: "led", label: "Status LED", props: { color: "red" } },
    ]);
    expect(scene.wires).toEqual([{ from: "uno.13", to: "led1.A", color: "green" }]);
    expect(scene.images).toEqual(["img-1"]);
  });

  it("tolerates habits models bring from other formats", () => {
    const scene = parseCompact("# comment\na A\nb B\na -> b call ~ a note on the arrow\nend\n}");
    expect(scene.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(scene.edges).toEqual([{ from: "a", to: "b", label: "call" }]);
  });

  it("names the line of a mistake", () => {
    expect(() => parseCompact("title X\ndir sideways")).toThrow(SceneError);
    expect(() => parseCompact("title X\ndir sideways")).toThrow(/Line 2/);
  });
});

describe("compact server", () => {
  async function connect() {
    const server = createServer({
      parts: await PartIndex.load(),
      viewerHtml: () => "<html></html>",
      compact: true,
    });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientSide);
    return client;
  }

  it("offers one sketch tool instead of the incremental ones", async () => {
    const client = await connect();
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain("sketch");
    expect(names).toContain("search_parts");
    expect(names).not.toContain("add_box");
    expect(names).not.toContain("render");
    expect(names).not.toContain("search_icons");
  });

  it("draws a compact scene and reports mistakes", async () => {
    const client = await connect();
    const call = (scene: string) =>
      client.callTool({ name: "sketch", arguments: { scene } }) as Promise<CallToolResult>;
    const ok = await call("a A\nb B\na -> b\nstep One: first | a a->b");
    expect(ok.isError).toBeFalsy();
    expect(JSON.stringify(ok.content)).toContain("2 nodes, 1 edge");
    const bad = await call("a A\na -> missing");
    expect(bad.isError).toBe(true);
    expect(JSON.stringify(bad.content)).toContain("missing");
  });
});

describe("follow-up layout", () => {
  const order = ["router", "auth", "handler", "db", "cache"];

  async function draw(
    parts: PartIndex,
    extra: boolean,
    previous?: ReturnType<typeof previousLayout>,
  ) {
    const b = new SceneBuilder(parts);
    b.reset({});
    b.addGroup({ id: "src", label: "src/" });
    for (const id of order) b.addNode({ id, label: `${id}.ts`, group: "src" });
    if (extra) b.addNode({ id: "logger", label: "logger.ts", group: "src" });
    for (const [from, to] of [
      ["router", "auth"],
      ["auth", "handler"],
      ["handler", "db"],
      ["handler", "cache"],
    ] as const)
      b.addEdge({ from, to });
    if (extra) {
      b.addEdge({ from: "db", to: "logger" });
      b.addEdge({ from: "cache", to: "router", style: "dashed" });
    }
    return layoutScene(b.scene, parts, { previous });
  }

  it("keeps shared nodes in place when a node and a back-edge are added", async () => {
    const parts = await PartIndex.load();
    const before = await draw(parts, false);
    const after = await draw(parts, true, previousLayout(before));
    expect(after.direction).toBe(before.direction);
    for (const id of order) {
      const a = before.nodes.find((n) => n.id === id)!;
      const b = after.nodes.find((n) => n.id === id)!;
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(40);
    }
  });

  it("ignores the previous drawing when the scene is a different one", async () => {
    const parts = await PartIndex.load();
    const before = await draw(parts, false);
    const b = new SceneBuilder(parts);
    b.reset({});
    for (const id of ["x", "y", "z"]) b.addNode({ id, label: id });
    b.addEdge({ from: "x", to: "y" });
    const fresh = await layoutScene(b.scene, parts);
    const other = await layoutScene(b.scene, parts, { previous: previousLayout(before) });
    expect(other.nodes.map((n) => [n.x, n.y])).toEqual(fresh.nodes.map((n) => [n.x, n.y]));
  });
});
