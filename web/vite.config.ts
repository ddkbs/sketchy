import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = resolve(import.meta.dirname, "..");
const version = (name: string) =>
  JSON.parse(readFileSync(`${root}/node_modules/${name}/package.json`, "utf8")).version as string;

// One script for the browser: layout engine, viewer, styles and fonts. Node
// built-ins the drawing core uses are swapped for browser shims.
export default defineConfig({
  root,
  publicDir: false,
  define: {
    __ICON_VERSIONS__: JSON.stringify({
      lucide: version("@iconify-json/lucide"),
      "simple-icons": version("@iconify-json/simple-icons"),
    }),
    __SQLJS_VERSION__: JSON.stringify(version("sql.js")),
    // Only module-relative file paths use it, and the browser build never reads them.
    "import.meta.url": "document.baseURI",
  },
  resolve: {
    alias: {
      "node:module": resolve(import.meta.dirname, "shims/module.ts"),
      "node:fs": resolve(import.meta.dirname, "shims/fs.ts"),
    },
  },
  build: {
    outDir: resolve(root, "build/web"),
    emptyOutDir: true,
    target: "es2022",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: {
      entry: resolve(import.meta.dirname, "sketchy.ts"),
      name: "Sketchy",
      formats: ["iife"],
      fileName: () => "sketchy.js",
    },
  },
});
