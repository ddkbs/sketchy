import elk from "elkjs/lib/elk.bundled.js";

/** Icon sets fetched before layout, keyed like the Node require path. */
export const preloaded = new Map<string, unknown>();
/** Where sql.js finds its WebAssembly in the browser. */
export const wasm = { url: "" };

// The drawing core loads elkjs, icon sets and the sql.js WebAssembly through
// createRequire; in the browser those come from the bundle or the CDN.
export function createRequire() {
  const require = (id: string): unknown => {
    if (id === "elkjs/lib/elk.bundled.js") return elk;
    return preloaded.get(id);
  };
  require.resolve = () => wasm.url;
  return require;
}
