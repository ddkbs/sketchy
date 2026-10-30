#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseEditor } from "./layout/links.js";
import { PartIndex } from "./parts/index.js";
import { PhotoService } from "./photos/service.js";
import { createPhotoTools } from "./photos/tools.js";
import { createServer } from "./server.js";
import { LocalDatabase, defaultDataDir } from "./storage/database.js";

const dataDir = defaultDataDir();
const parts = await PartIndex.load();
const photos =
  process.env.SKETCHY_PHOTOS === "off"
    ? undefined
    : createPhotoTools(new PhotoService(await LocalDatabase.open(dataDir), dataDir));

const server = createServer({ parts, photos, editor: parseEditor(process.env.SKETCHY_EDITOR) });
await server.connect(new StdioServerTransport());

// stdout is reserved for MCP messages, so diagnostics go to stderr.
console.error(`sketchy: MCP server running on stdio (data in ${dataDir})`);
