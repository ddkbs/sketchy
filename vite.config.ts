import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The viewer ships as one self-contained HTML file served as an MCP App resource.
export default defineConfig(({ command }) => ({
  root: "viewer",
  // Preview fixtures are only served in development.
  publicDir: command === "serve" ? "../build/preview" : false,
  plugins: [viteSingleFile()],
  build: {
    outDir: "../build",
    emptyOutDir: false,
    target: "es2022",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    rollupOptions: { input: "viewer/viewer.html" },
  },
}));
