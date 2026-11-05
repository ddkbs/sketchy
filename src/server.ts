import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  RESOURCE_MIME_TYPE,
  getUiCapability,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { layoutScene, previousLayout, type PreviousLayout } from "./layout/index.js";
import type { Editor } from "./layout/links.js";
import type { PartIndex } from "./parts/index.js";
import { COMPACT_INSTRUCTIONS, COMPACT_SYNTAX, INSTRUCTIONS, PATTERNS } from "./patterns.js";
import { parseCompact } from "./scene/compact.js";
import { SceneBuilder, SceneError } from "./scene/builder.js";
import { suggestIcons } from "./icons.js";
import { isEditorLink, type Opener } from "./opener.js";
import type { LaidOutScene } from "./scene/laid-out.js";
import type { StandaloneSink } from "./standalone.js";
import type { TerminalSink } from "./terminal.js";
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
import type { ExportSink } from "./exports.js";
import type { PhotoTools } from "./photos/tools.js";
import { ViewStore } from "./views.js";

export const VERSION = "0.1.8";
export const VIEWER_URI = "ui://sketchy/viewer.html";
export const VIEWER_URL = new URL("../build/viewer.html", import.meta.url);
export { SCENE_META_KEY } from "./views.js";

export type ServerOptions = {
  parts: PartIndex;
  editor?: Editor;
  /** Photo search and grounding; omitted where only the drawing core runs. */
  photos?: PhotoTools;
  viewerHtml?: () => string;
  /** Where the viewer's exports go; omitted where there is no local disk. */
  exports?: ExportSink;
  /** Opens file links from the drawing in the editor; local servers only. */
  opener?: Opener;
  /**
   * Saves drawings as files for clients that cannot show the viewer inline;
   * local servers only.
   */
  standalone?: StandaloneSink;
  /**
   * Set for the Sketchy plugin for Claude Code, which draws every result in
   * the terminal from the files this writes; local servers only.
   */
  terminal?: TerminalSink;
  /**
   * One `sketch` tool taking the compact line syntax and short instructions;
   * about half the tokens of the JSON tools. Off restores every tool.
   */
  compact?: boolean;
};

export function createServer(options: ServerOptions): McpServer {
  const { parts } = options;
  const builder = new SceneBuilder(parts);
  const views = new ViewStore();
  const server = new McpServer(
    { name: "sketchy", version: VERSION },
    { instructions: options.compact ? COMPACT_INSTRUCTIONS : INSTRUCTIONS },
  );
  const viewerHtml = options.viewerHtml ?? (() => readFileSync(VIEWER_URL, "utf8"));

  // Hosts differ in whether they embed MCP App views; logging it makes a
  // missing viewer easy to diagnose.
  const showsViewer = () =>
    getUiCapability(server.server.getClientCapabilities())?.mimeTypes?.includes(
      RESOURCE_MIME_TYPE,
    ) ?? false;
  server.server.oninitialized = () => {
    const client = server.server.getClientVersion();
    console.error(
      `sketchy: connected to ${client?.name ?? "unknown client"} ${client?.version ?? ""}, ` +
        `inline viewer ${showsViewer() ? "supported" : "not supported"}`,
    );
  };

  registerAppResource(
    server,
    "Sketchy viewer",
    VIEWER_URI,
    { description: "Renders Sketchy scenes." },
    async () => ({
      contents: [{ uri: VIEWER_URI, mimeType: RESOURCE_MIME_TYPE, text: viewerHtml() }],
    }),
  );

  // Follow-ups keep the places of what the last drawing already showed.
  let lastLayout: PreviousLayout | undefined;
  const render = async (): Promise<CallToolResult> => {
    if (builder.isEmpty()) return fail("The scene is empty. Add nodes, parts or images first.");
    const laidOut = await layoutScene(builder.scene, parts, {
      editor: options.editor,
      previous: lastLayout,
    });
    lastLayout = previousLayout(laidOut);
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
    const text =
      showsViewer() || options.terminal
        ? `Rendered${s.title ? ` "${s.title}"` : ""}: ${summary}. The user now sees the drawing${options.terminal && !showsViewer() ? " in the terminal" : ""}${s.steps.length ? " with step navigation" : ""}; explain it briefly instead of describing it again.`
        : await unseen(laidOut, summary);
    const attached = views.attach(laidOut);
    // The plugin reads the drawing from these files; the paths are all it adds.
    const terminal =
      options.terminal && !showsViewer() ? await options.terminal(laidOut) : undefined;
    // Some clients hand the model only structuredContent, so it carries the reply too.
    return {
      content: [{ type: "text", text }],
      ...attached,
      structuredContent: {
        ...attached.structuredContent,
        message: text,
        ...(terminal ? { terminal } : {}),
      },
    };
  };

  /** The reply for clients without MCP Apps: the drawing goes to a file, if it can. */
  const unseen = async (laidOut: LaidOutScene, summary: string): Promise<string> => {
    const explain = "explain the diagram fully in text";
    if (options.standalone) {
      try {
        const path = await options.standalone(laidOut);
        return `Laid out ${summary}. Inline display isn't supported in this client. Saved the diagram to ${path}. Tell the user to open it, and ${explain}.`;
      } catch (error) {
        console.error("sketchy: could not save the drawing:", error);
      }
    }
    return `Laid out ${summary}. Inline display isn't supported in this client, so the user cannot see the drawing; ${explain}.`;
  };

  const uiMeta = { ui: { resourceUri: VIEWER_URI } };

  type SketchInput = {
    title?: string;
    subtitle?: string;
    direction?: "right" | "down";
    groups?: Parameters<SceneBuilder["addGroup"]>[0][];
    nodes?: Parameters<SceneBuilder["addNode"]>[0][];
    parts?: Parameters<SceneBuilder["addPart"]>[0][];
    images?: string[];
    edges?: Parameters<SceneBuilder["addEdge"]>[0][];
    wires?: Parameters<SceneBuilder["connect"]>[0][];
    labels?: Parameters<SceneBuilder["addLabel"]>[0][];
    steps?: Parameters<SceneBuilder["addStep"]>[0][];
  };
  const draw = async (input: SketchInput): Promise<CallToolResult> => {
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
  };

  if (options.compact) {
    registerAppTool(
      server,
      "sketch",
      {
        title: "Sketch a scene",
        description: COMPACT_SYNTAX,
        inputSchema: { scene: z.string().describe("The scene, one element per line") },
        _meta: uiMeta,
      },
      async ({ scene }) => {
        try {
          return await draw(parseCompact(scene));
        } catch (error) {
          return failFrom(error);
        }
      },
    );
  } else {
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
      draw,
    );
  }

  // The compact format draws a whole scene per call; the incremental tools
  // and their long schemas would only cost tokens there.
  if (!options.compact) {
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
  }

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

  if (!options.compact) {
    tool(
      server,
      "search_icons",
      "Find icon names for nodes.",
      { query: z.string().describe("Keyword, e.g. 'database', 'react', 'user'") },
      ({ query }) => suggestIcons(query, 15).join("\n") || `No icons match "${query}".`,
    );
  }

  options.photos?.register(server, builder, views, { compact: options.compact });

  registerAppTool(
    server,
    "get_view",
    {
      title: "Get viewer data",
      description: "Returns the data behind a Sketchy view. Used by the viewer.",
      inputSchema: { view: z.string() },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ view }): Promise<CallToolResult> => {
      const payload = views.get(view);
      if (!payload) return fail("This drawing has expired. Ask for the drawing again.");
      return {
        content: [{ type: "text", text: "Viewer data." }],
        structuredContent: payload as Record<string, unknown>,
      };
    },
  );

  if (options.opener) {
    const open = options.opener;
    registerAppTool(
      server,
      "open_link",
      {
        title: "Open file link",
        description: "Opens a file from the drawing in the user's editor. Used by the viewer.",
        inputSchema: { url: z.string().max(2048) },
        _meta: { ui: { visibility: ["app"] } },
      },
      async ({ url }): Promise<CallToolResult> => {
        if (!isEditorLink(url)) return fail("Only editor links to files can be opened.");
        try {
          await open(url);
          return { content: [{ type: "text", text: `Opened ${url}` }] };
        } catch (error) {
          return failFrom(error);
        }
      },
    );
  }

  if (options.exports) {
    const sink = options.exports;
    registerAppTool(
      server,
      "save_export",
      {
        title: "Save export",
        description: "Saves an SVG, PNG or Excalidraw export of the drawing. Used by the viewer.",
        inputSchema: {
          name: z.string().max(120),
          text: z.string().optional(),
          base64: z.string().optional(),
        },
        _meta: { ui: { visibility: ["app"] } },
      },
      async (file): Promise<CallToolResult> => {
        if ((file.text === undefined) === (file.base64 === undefined))
          return fail("Pass either text or base64.");
        try {
          const path = await sink.save(file);
          if (path === null)
            return {
              content: [{ type: "text", text: "Cancelled." }],
              structuredContent: { cancelled: true },
            };
          return {
            content: [{ type: "text", text: `Saved ${path}` }],
            structuredContent: { path },
          };
        } catch (error) {
          return failFrom(error);
        }
      },
    );
  }

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
