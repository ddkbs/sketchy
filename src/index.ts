#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseEditor } from "./layout/links.js";
import { PartIndex } from "./parts/index.js";
import { createServer } from "./server.js";

const parts = await PartIndex.load();
const server = createServer({
  parts,
  editor: parseEditor(process.env.SKETCHY_EDITOR),
});

await server.connect(new StdioServerTransport());

// stdout is reserved for MCP messages, so diagnostics go to stderr.
console.error("sketchy: MCP server running on stdio");
