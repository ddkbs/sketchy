import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type Transformers = typeof import("@huggingface/transformers");

const PACKAGE = "@huggingface/transformers";

let loading: Promise<Transformers> | undefined;

/**
 * Loads transformers.js. The desktop bundles ship it; the npm package leaves it
 * out (it pulls in a few hundred MB of native runtimes) and installs it into
 * the data folder the first time a photo-labeling model is needed.
 */
export function loadTransformers(runtimeDir: string): Promise<Transformers> {
  loading ??= load(runtimeDir).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

async function load(runtimeDir: string): Promise<Transformers> {
  try {
    return (await import(PACKAGE)) as Transformers;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  // Bare imports resolve from the importing file, so a re-export inside the
  // runtime folder picks up the copy installed there.
  const entry = join(runtimeDir, "index.mjs");
  if (!existsSync(join(runtimeDir, "node_modules", ...PACKAGE.split("/")))) {
    await install(runtimeDir);
  }
  return (await import(pathToFileURL(entry).href)) as Transformers;
}

function isMissing(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  return code === "ERR_MODULE_NOT_FOUND" && (message ?? "").includes(PACKAGE);
}

async function install(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify({ private: true, type: "module" })}\n`,
  );
  writeFileSync(join(dir, "index.mjs"), `export * from "${PACKAGE}";\n`);
  const spec = `${PACKAGE}@${requiredRange()}`;
  console.error(`sketchy: installing ${spec} for photo labeling into ${dir}`);
  await new Promise<void>((resolve, reject) => {
    execFile(
      "npm",
      [
        "install",
        // cmd.exe would read the ^ of the range as an escape character.
        process.platform === "win32" ? `"${spec}"` : spec,
        "--omit=dev",
        "--no-audit",
        "--no-fund",
        "--loglevel=error",
      ],
      // npm is a .cmd shim on Windows and needs a shell to start.
      { cwd: dir, shell: process.platform === "win32", timeout: 15 * 60_000 },
      (error, _stdout, stderr) => {
        if (!error) return resolve();
        reject(
          new Error(
            `Photo labeling needs ${PACKAGE}, and installing it with npm failed: ${stderr.trim() || error.message}`,
          ),
        );
      },
    );
  });
}

/** The version range this release was built and tested with. */
function requiredRange(): string {
  const manifest = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { peerDependencies?: Record<string, string> };
  return manifest.peerDependencies?.[PACKAGE] ?? "latest";
}
