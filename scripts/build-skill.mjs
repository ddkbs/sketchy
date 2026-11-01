// Builds the Claude skill: SKILL.md, a render script with its runtime
// packages, the part catalog and a standalone viewer, zipped as
// sketchy-skill.zip. The skill draws in the Claude chat without a server.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";

const root = new URL("../", import.meta.url).pathname;
const out = `${root}build/skill/sketchy`;
const scripts = `${out}/scripts`;
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));

rmSync(`${root}build/skill`, { recursive: true, force: true });
mkdirSync(scripts, { recursive: true });

// Code goes into one file; packages that load data files at runtime (icons,
// WebAssembly, the layout engine) stay imports and ship pruned below.
const RUNTIME = ["elkjs", "sql.js", "@iconify-json/lucide", "@iconify-json/simple-icons"];
const result = await esbuild({
  entryPoints: [`${root}skill/render.ts`],
  outfile: `${scripts}/render.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: RUNTIME.flatMap((name) => [name, `${name}/*`]),
  metafile: true,
  logLevel: "warning",
});
const external = new Set(
  Object.values(result.metafile.outputs)
    .flatMap((o) => o.imports)
    .filter((i) => i.external && !i.path.startsWith("node:"))
    .map((i) =>
      i.path
        .split("/")
        .slice(0, i.path.startsWith("@") ? 2 : 1)
        .join("/"),
    ),
);
// Loaded through createRequire, which esbuild cannot see.
for (const name of RUNTIME) external.add(name);

const version = (name) =>
  JSON.parse(readFileSync(`${root}node_modules/${name}/package.json`, "utf8")).version;
const dependencies = Object.fromEntries([...external].sort().map((n) => [n, version(n)]));
writeFileSync(
  `${scripts}/package.json`,
  JSON.stringify({ name: "sketchy-skill", private: true, type: "module", dependencies }, null, 2),
);
execFileSync("npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: scripts,
  stdio: "ignore",
});
// Keep only the files the render script loads.
const keep = {
  elkjs: ["package.json", "lib/elk.bundled.js"],
  "sql.js": ["package.json", "dist/sql-wasm.js", "dist/sql-wasm.wasm"],
};
for (const [name, files] of Object.entries(keep)) {
  const dir = `${scripts}/node_modules/${name}`;
  const tmp = `${dir}.keep`;
  for (const f of files) cpSync(`${dir}/${f}`, `${tmp}/${f}`);
  rmSync(dir, { recursive: true });
  cpSync(tmp, dir, { recursive: true });
  rmSync(tmp, { recursive: true });
}

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
cpSync(`${root}skill/SKILL.md`, `${out}/SKILL.md`);
cpSync(`${root}LICENSE`, `${out}/LICENSE`);

const zip = `${root}sketchy-skill-${pkg.version}.zip`;
rmSync(zip, { force: true });
execFileSync("zip", ["-qr", zip, "sketchy"], { cwd: `${root}build/skill` });
console.log(`skill: wrote ${zip}`);
