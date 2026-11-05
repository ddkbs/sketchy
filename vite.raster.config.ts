import { defineConfig } from "vite";

// The viewer's renderer bundled for Node, so the server can draw PNGs for
// surfaces that show images but run no viewer (the Claude Code terminal).
export default defineConfig({
  build: {
    ssr: "viewer/src/raster.ts",
    outDir: "build",
    emptyOutDir: false,
    target: "node20",
    rollupOptions: { output: { entryFileNames: "raster.js", format: "es" } },
  },
  // Everything is bundled, so the npm package needs no DOM or rough.js at runtime.
  ssr: { noExternal: true },
});
