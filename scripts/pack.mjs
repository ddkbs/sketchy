// Builds a platform-specific .mcpb bundle: production dependencies only,
// with native binaries for other platforms removed to keep the download small.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const stage = join(root, "build", "bundle");
const platform = process.env.TARGET_PLATFORM ?? process.platform;
const arch = process.env.TARGET_ARCH ?? process.arch;
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
// npm and npx are .cmd shims on Windows and need a shell to start.
const run = (cmd, args, cwd = root) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });

run("npm", ["run", "build"]);

rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, "build"), { recursive: true });
for (const file of [
  "manifest.json",
  "package.json",
  "package-lock.json",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
]) {
  cpSync(join(root, file), join(stage, file));
}
cpSync(join(root, "dist"), join(stage, "dist"), {
  recursive: true,
  filter: (src) => !src.endsWith(".map"),
});
cpSync(join(root, "assets", "icon.png"), join(stage, "assets", "icon.png"));
for (const file of ["parts.json", "viewer.html"])
  cpSync(join(root, "build", file), join(stage, "build", file));

run(
  "npm",
  [
    "ci",
    "--omit=dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    `--os=${platform}`,
    `--cpu=${arch}`,
    // Without a libc, cross builds skip the glibc-only native packages (sharp).
    ...(platform === "linux" ? ["--libc=glibc"] : []),
  ],
  stage,
);

// transformers.js bundles the web runtime it needs; the separate package is unused in Node.
rmSync(join(stage, "node_modules", "onnxruntime-web"), { recursive: true, force: true });
const ortBin = join(stage, "node_modules", "onnxruntime-node", "bin");
if (existsSync(ortBin)) {
  for (const napi of readdirSync(ortBin)) {
    for (const os of readdirSync(join(ortBin, napi))) {
      for (const cpu of readdirSync(join(ortBin, napi, os))) {
        if (os !== platform || cpu !== arch)
          rmSync(join(ortBin, napi, os, cpu), { recursive: true, force: true });
      }
    }
  }
}

const out = join(root, `sketchy-${version}-${platform}-${arch}.mcpb`);
run("npx", ["mcpb", "pack", stage, out]);
console.error(`pack: wrote ${out}`);
