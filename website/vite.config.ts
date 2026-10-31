import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The live demo renders with the real viewer code from ../viewer; its dependencies resolve from
// this package so the site builds without installing the server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ["roughjs", "@fontsource/kalam", "react", "react-dom"] },
  server: { fs: { allow: [".."] } },
});
