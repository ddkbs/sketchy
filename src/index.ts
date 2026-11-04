#!/usr/bin/env node
import { join } from "node:path";
import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setting } from "./env.js";
import { dialogSink } from "./exports.js";
import { systemOpener } from "./opener.js";
import { standaloneFiles } from "./standalone.js";
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
const editor = parseEditor(setting("SKETCHY_EDITOR"));
// Photo grounding needs a local model, so remote deployments leave it off.
const photosEnabled = (setting("SKETCHY_PHOTOS") ?? (values.http ? "off" : "on")) !== "off";
const dataDir = defaultDataDir();
const photos = photosEnabled ? await openPhotos(dataDir) : undefined;

// A broken data folder must not take the drawing tools down with it.
async function openPhotos(dir: string) {
  try {
    return createPhotoTools(new PhotoService(await LocalDatabase.open(dir), dir));
  } catch (error) {
    console.error(`sketchy: photo labeling disabled, cannot use data folder ${dir}:`, error);
    return undefined;
  }
}

if (values.http) {
  serveHttp(Number(values.port), () => createServer({ parts, photos, editor }));
} else {
  await createServer({
    parts,
    photos,
    editor,
    exports: dialogSink(),
    opener: systemOpener(),
    // Clients without MCP Apps get each drawing as an interactive HTML file.
    standalone: standaloneFiles(join(dataDir, "exports"), setting("SKETCHY_OPEN") === "1"),
    // "json" restores the JSON scene tools of earlier versions.
    compact: setting("SKETCHY_FORMAT") !== "json",
  }).connect(new StdioServerTransport());
  // stdout is reserved for MCP messages, so diagnostics go to stderr.
  console.error(`sketchy: MCP server running on stdio${photos ? ` (data in ${dataDir})` : ""}`);
}
