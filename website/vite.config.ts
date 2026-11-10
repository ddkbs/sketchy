import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

const page = (path: string) => resolve(import.meta.dirname, path);

// The live demo renders with the real viewer code from ../viewer; its dependencies resolve from
// this package so the site builds without installing the server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["roughjs", "@fontsource/kalam", "react", "react-dom", "d3-geo", "topojson-client", "world-atlas"],
  },
  server: { fs: { allow: [".."] } },
  build: {
    rollupOptions: {
      input: {
        index: page("index.html"),
        docs: page("docs/index.html"),
      },
    },
  },
});
