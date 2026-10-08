import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Scene } from "./scene.js";

const scene: Scene = { boxes: [], arrows: [] };

const server = new McpServer({ name: "sketchy", version: "0.0.0" });

server.registerTool(
  "add_box",
  {
    title: "Add box",
    description:
      "Add a labeled box to the current scene. Do not pass coordinates or sizes; the layout is computed automatically.",
    inputSchema: {
      id: z.string().describe("Unique id used to reference this box, e.g. 'server'"),
      label: z.string().describe("Text shown inside the box"),
    },
  },
  async ({ id, label }) => {
    if (scene.boxes.some((box) => box.id === id)) {
      return {
        isError: true,
        content: [{ type: "text", text: `A box with id "${id}" already exists.` }],
      };
    }
    scene.boxes.push({ id, label });
    return { content: [{ type: "text", text: `Added box "${id}".` }] };
  },
);

server.registerTool(
  "add_arrow",
  {
    title: "Add arrow",
    description: "Add an arrow between two boxes, by choice labeled",
    inputSchema: {
      from: z.string().describe("From which box the arrow comes from"),
      to: z.string().describe("To which box the arrow should go"),
      label: z.string().optional().describe("Labels the arrow"),
    },
  },
  async ({ from, to, label }) => {
    if (!scene.boxes.some((box) => box.id === from)) {
      return {
        isError: true,
        content: [{ type: "text", text: `There is no box "${from}".` }],
      };
    }
    if (!scene.boxes.some((box) => box.id === to)) {
      return {
        isError: true,
        content: [{ type: "text", text: `There is no box "${to}".` }],
      };
    }
    scene.arrows.push({ from, to, label });
    return { content: [{ type: "text", text: `Added arrow` }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

// stdout is reserved for MCP messages, so diagnostics go to stderr.
console.error("sketchy: MCP server running on stdio");
