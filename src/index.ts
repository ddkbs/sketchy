#!/usr/bin/env node
import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { serveHttp } from "./http.js";
import { parseEditor } from "./layout/links.js";
import { PartIndex } from "./parts/index.js";
import { PhotoService } from "./photos/service.js";
import { createPhotoTools } from "./photos/tools.js";
import { createServer } from "./server.js";
import { LocalDatabase, defaultDataDir } from "./storage/database.js";

const { values } = parseArgs({
  options: {
    http: { type: "boolean", default: false },
    port: { type: "string", default: process.env.PORT ?? "3000" },
  },
});

const parts = await PartIndex.load();
const editor = parseEditor(process.env.SKETCHY_EDITOR);
// Photo grounding needs a local model, so remote deployments leave it off.
const photosEnabled = (process.env.SKETCHY_PHOTOS || (values.http ? "off" : "on")) !== "off";
const dataDir = defaultDataDir();
const photos = photosEnabled
  ? createPhotoTools(new PhotoService(await LocalDatabase.open(dataDir), dataDir))
  : undefined;

if (values.http) {
  serveHttp(Number(values.port), () => createServer({ parts, photos, editor }));
} else {
  await createServer({ parts, photos, editor }).connect(new StdioServerTransport());
  // stdout is reserved for MCP messages, so diagnostics go to stderr.
  console.error(`sketchy: MCP server running on stdio${photos ? ` (data in ${dataDir})` : ""}`);
}
