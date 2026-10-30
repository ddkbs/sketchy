import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { layoutScene } from "./layout/index.js";
import type { Editor } from "./layout/links.js";
import type { PartIndex } from "./parts/index.js";
import { INSTRUCTIONS, PATTERNS } from "./patterns.js";
import { SceneBuilder, SceneError } from "./scene/builder.js";
import { suggestIcons } from "./icons.js";
import {
  edgeShape,
  groupShape,
  labelShape,
  nodeShape,
  partShape,
  sceneMetaShape,
  sketchShape,
  stepShape,
  wireShape,
} from "./tools/schemas.js";
import type { PhotoTools } from "./photos/tools.js";

export const VERSION = "0.1.0";
export const VIEWER_URI = "ui://sketchy/viewer.html";
export const VIEWER_URL = new URL("../build/viewer.html", import.meta.url);
/** Result `_meta` key carrying data for the viewer only, not the model. */
export const SCENE_META_KEY = "sketchy/scene";

export type ServerOptions = {
  parts: PartIndex;
  editor?: Editor;
  /** Photo search and grounding; omitted where only the drawing core runs. */
  photos?: PhotoTools;
  viewerHtml?: () => string;
};

export function createServer(options: ServerOptions): McpServer {
  const { parts } = options;
  const builder = new SceneBuilder(parts);
  const server = new McpServer(
    { name: "sketchy", version: VERSION },
    { instructions: INSTRUCTIONS },
  );
  const viewerHtml = options.viewerHtml ?? (() => readFileSync(VIEWER_URL, "utf8"));

  registerAppResource(
    server,
    "Sketchy viewer",
    VIEWER_URI,
    { description: "Renders Sketchy scenes." },
    async () => ({
      contents: [{ uri: VIEWER_URI, mimeType: RESOURCE_MIME_TYPE, text: viewerHtml() }],
    }),
  );

  const render = async (): Promise<CallToolResult> => {
    if (builder.isEmpty()) return fail("The scene is empty. Add nodes, parts or images first.");
    const laidOut = await layoutScene(builder.scene, parts, { editor: options.editor });
    const s = builder.scene;
    const counts = [
      [s.nodes.length, "node"],
      [s.edges.length, "edge"],
      [s.groups.length, "group"],
      [s.parts.length, "part"],
      [s.wires.length, "wire"],
      [s.labels.length, "label"],
      [s.images.length, "image"],
      [s.steps.length, "step"],
    ] as const;
    const summary = counts
      .filter(([n]) => n > 0)
      .map(([n, what]) => `${n} ${what}${n === 1 ? "" : "s"}`)
      .join(", ");
    return {
      content: [
        {
          type: "text",
          text: `Rendered${s.title ? ` "${s.title}"` : ""}: ${summary}. The user now sees the drawing${s.steps.length ? " with step navigation" : ""}; explain it briefly instead of describing it again.`,
        },
      ],
      structuredContent: { rendered: true, width: laidOut.width, height: laidOut.height },
      _meta: { [SCENE_META_KEY]: laidOut },
    };
  };

  const uiMeta = { ui: { resourceUri: VIEWER_URI } };

  registerAppTool(
    server,
    "sketch",
    {
      title: "Sketch a complete scene",
      description:
        "Draw a whole scene in one call and show it to the user. Replaces the current scene. Ids must be unique across all elements; edges, wires, labels and steps may only reference ids defined in the same call.",
      inputSchema: sketchShape,
      _meta: uiMeta,
    },
    async (input) => {
      try {
        builder.reset({ title: input.title, subtitle: input.subtitle, direction: input.direction });
        for (const g of input.groups ?? []) builder.addGroup(g);
        for (const n of input.nodes ?? []) builder.addNode(n);
        for (const p of input.parts ?? []) builder.addPart(p);
        for (const imageId of input.images ?? []) {
          if (!options.photos)
            throw new SceneError("Photo features are not available on this server.");
          builder.addImage(await options.photos.sceneImage(imageId));
        }
        for (const e of input.edges ?? []) builder.addEdge(e);
        for (const w of input.wires ?? []) builder.connect(w);
        for (const l of input.labels ?? []) builder.addLabel(l);
        for (const s of input.steps ?? []) builder.addStep(s);
      } catch (error) {
        return failFrom(error);
      }
      return render();
    },
  );

  registerAppTool(
    server,
    "render",
    {
      title: "Render scene",
      description: "Lay out the current scene and show it to the user in the Sketchy viewer.",
      inputSchema: {},
      _meta: uiMeta,
    },
    render,
  );

  tool(server, "new_scene", "Start a new, empty scene.", sceneMetaShape, (input) => {
    builder.reset(input);
    return "Started a new scene.";
  });

  tool(
    server,
    "add_box",
    "Add a labeled box. Positions are computed automatically.",
    nodeShape,
    (input) => {
      builder.addNode(input);
      return `Added box "${input.id}".`;
    },
  );

  tool(
    server,
    "add_node",
    "Add a node for code diagrams (module, service, file). Pass the absolute file path so clicking the node opens it.",
    nodeShape,
    (input) => {
      builder.addNode(input);
      return `Added node "${input.id}".`;
    },
  );

  tool(
    server,
    "add_text",
    "Add a free text note to the scene.",
    { id: nodeShape.id, text: z.string(), group: nodeShape.group },
    ({ id, text, group }) => {
      builder.addNode({ id, label: text, group, shape: "text" });
      return `Added text "${id}".`;
    },
  );

  tool(
    server,
    "add_group",
    "Add a group (folder, layer, area) that encloses nodes or parts.",
    groupShape,
    (input) => {
      builder.addGroup(input);
      return `Added group "${input.id}".`;
    },
  );

  for (const name of ["add_arrow", "add_edge"]) {
    tool(server, name, "Add an arrow between two elements.", edgeShape, (input) => {
      const edgeId = builder.addEdge(input);
      return `Added edge "${edgeId}".`;
    });
  }

  tool(
    server,
    "place_part",
    "Place an electronic part (board, sensor, LED, …) from the part library. Use search_parts to find types and pin names.",
    partShape,
    (input) => {
      builder.addPart(input);
      const pins = parts.pins(input.type).map((p) => p.name);
      return `Placed ${input.type} "${input.id}". Pins: ${pins.join(", ") || "none"}.`;
    },
  );

  tool(
    server,
    "connect",
    "Connect two part pins with a wire, routed automatically.",
    wireShape,
    (input) => {
      const wireId = builder.connect(input);
      return `Connected "${wireId}".`;
    },
  );

  tool(
    server,
    "label",
    "Annotate a part pin, an image region or a node with a callout label. The label position is computed automatically.",
    labelShape,
    (input) => {
      const labelId = builder.addLabel(input);
      return `Added label "${labelId}".`;
    },
  );

  tool(
    server,
    "add_step",
    "Add a walkthrough step. In the viewer the user clicks through steps; each one emphasizes its highlighted elements and dims the rest.",
    stepShape,
    (input) => `Added step ${builder.addStep(input)}.`,
  );

  tool(
    server,
    "search_parts",
    "Search the part library (boards, sensors, displays, LEDs, …). With an exact type it lists the part's pins.",
    {
      query: z.string().describe("Type or keywords, e.g. 'arduino-uno', 'distance sensor', 'oled'"),
    },
    ({ query }) => {
      const detail = parts.detail(query.trim());
      if (detail) {
        const pins = detail.pinList
          .map((p) => (p.signals.length ? `${p.name} (${p.signals.join(", ")})` : p.name))
          .join(", ");
        const variants = detail.variants.length
          ? `\nVariants (props): ${detail.variants.join(", ")}`
          : "";
        return `${detail.title} [${detail.type}], ${detail.category}\nPins: ${pins || "none"}${variants}`;
      }
      const found = parts.search(query);
      if (found.length === 0) return `No parts match "${query}". Draw it as a box instead.`;
      return found.map((p) => `${p.type} — ${p.title} (${p.category}, ${p.pins} pins)`).join("\n");
    },
  );

  tool(
    server,
    "search_icons",
    "Find icon names for nodes.",
    { query: z.string().describe("Keyword, e.g. 'database', 'react', 'user'") },
    ({ query }) => suggestIcons(query, 15).join("\n") || `No icons match "${query}".`,
  );

  options.photos?.register(server, builder);

  for (const pattern of PATTERNS) {
    server.registerPrompt(
      pattern.name,
      {
        title: pattern.title,
        description: pattern.description,
        argsSchema: { [pattern.argument.name]: z.string().describe(pattern.argument.description) },
      },
      (args: Record<string, string>) => ({
        messages: [
          {
            role: "user",
            content: { type: "text", text: pattern.template(args[pattern.argument.name] ?? "") },
          },
        ],
      }),
    );
  }

  return server;
}

/** Registers a plain tool whose handler returns text or throws a SceneError. */
export function tool<Shape extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: Shape,
  handler: (input: z.infer<z.ZodObject<Shape>>) => string | Promise<string>,
): void {
  server.registerTool(name, { description, inputSchema }, (async (
    input: z.infer<z.ZodObject<Shape>>,
  ) => {
    try {
      return { content: [{ type: "text", text: await handler(input) }] };
    } catch (error) {
      return failFrom(error);
    }
  }) as never);
}

export function fail(text: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text }] };
}

export function failFrom(error: unknown): CallToolResult {
  if (error instanceof SceneError) return fail(error.message);
  console.error("sketchy:", error);
  return fail(`Internal error: ${error instanceof Error ? error.message : String(error)}`);
}
