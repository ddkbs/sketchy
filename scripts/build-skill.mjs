// Builds the Claude skill: SKILL.md, one bundled render script, the part
// catalog and a standalone viewer, zipped as sketchy-skill-<version>.zip. The skill draws in the Claude chat without a server.
// With SKETCHY_PIN_REF set to a commit of the cdn branch, it also writes
// sketchy-skill-<version>-pinned.zip, which loads that exact bundle and checks
// it with Subresource Integrity.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";

const root = new URL("../", import.meta.url).pathname;
const out = `${root}build/skill/sketchy`;
const scripts = `${out}/scripts`;
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));

rmSync(`${root}build/skill`, { recursive: true, force: true });
mkdirSync(scripts, { recursive: true });

// Everything goes into one file: skill uploads reject paths such as
// node_modules/@iconify-json, so no package folders ship. The modules our
// code loads through createRequire are swapped for static imports.
const shim = `
import lucide from "@iconify-json/lucide/icons.json";
import simpleIcons from "@iconify-json/simple-icons/icons.json";
import elk from "elkjs/lib/elk.bundled.js";
const modules = {
  "@iconify-json/lucide/icons.json": lucide,
  "@iconify-json/simple-icons/icons.json": simpleIcons,
  "elkjs/lib/elk.bundled.js": elk,
};
export function createRequire() {
  const require = (id) => {
    if (!(id in modules)) throw new Error("Not bundled: " + id);
    return modules[id];
  };
  // sql.js loads its WebAssembly from next to the bundle.
  require.resolve = () => new URL("./sql-wasm.wasm", import.meta.url).pathname;
  return require;
}`;
await esbuild({
  entryPoints: [`${root}skill/render.ts`],
  outfile: `${scripts}/render.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Bundled CommonJS (sql.js) still uses require and __dirname.
  banner: {
    js: [
      'import { createRequire as __createRequire } from "node:module";',
      "const require = __createRequire(import.meta.url);",
      'const __dirname = new URL(".", import.meta.url).pathname;',
    ].join(" "),
  },
  plugins: [
    {
      name: "bundle-runtime-requires",
      setup(build) {
        build.onResolve({ filter: /^node:module$/ }, (args) =>
          args.importer.startsWith(`${root}src/`) ? { path: "shim", namespace: "shim" } : undefined,
        );
        build.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
          contents: shim,
          resolveDir: root,
          loader: "js",
        }));
      },
    },
  ],
  logLevel: "warning",
});
cpSync(`${root}node_modules/sql.js/dist/sql-wasm.wasm`, `${scripts}/sql-wasm.wasm`);

await viteBuild({
  configFile: `${root}vite.config.ts`,
  logLevel: "warn",
  build: {
    outDir: `${root}build/skill/viewer`,
    emptyOutDir: true,
    rollupOptions: { input: `${root}viewer/standalone.html` },
  },
});
cpSync(`${root}build/skill/viewer/standalone.html`, `${scripts}/viewer.html`);
rmSync(`${root}build/skill/viewer`, { recursive: true });
cpSync(`${root}build/parts.json`, `${scripts}/parts.json`);
cpSync(`${root}LICENSE`, `${out}/LICENSE`);

const skillTemplate = readFileSync(`${root}skill/SKILL.md`, "utf8");
function writeZip(name, cdn, sri) {
  writeFileSync(
    `${out}/SKILL.md`,
    skillTemplate.replaceAll("{{CDN}}", cdn).replaceAll(" {{SRI}}", sri),
  );
  const zip = `${root}${name}`;
  rmSync(zip, { force: true });
  execFileSync("zip", ["-qr", zip, "sketchy"], { cwd: `${root}build/skill` });
  console.log(`skill: wrote ${zip}`);
}

// Widgets load the browser bundle from jsDelivr. The folder follows the minor
// version, which every patch release overwrites, so skills get fixes without
// being uploaded again.
const minor = pkg.version.split(".").slice(0, 2).join(".");
writeZip(
  `sketchy-skill-${pkg.version}.zip`,
  `https://cdn.jsdelivr.net/gh/ddkbs/sketchy@cdn/${minor}`,
  "",
);

// The pinned skill loads from a commit, which never changes, and the browser
// refuses the script unless it matches the hash of the bundle built here.
const pin = process.env.SKETCHY_PIN_REF;
if (pin) {
  if (!/^[0-9a-f]{40}$/.test(pin)) throw new Error("SKETCHY_PIN_REF must be a full commit SHA");
  const bundle = readFileSync(`${root}build/web/sketchy.js`);
  const hash = createHash("sha384").update(bundle).digest("base64");
  writeZip(
    `sketchy-skill-${pkg.version}-pinned.zip`,
    `https://cdn.jsdelivr.net/gh/ddkbs/sketchy@${pin}/${pkg.version}`,
    ` integrity="sha384-${hash}" crossorigin="anonymous"`,
  );
}
