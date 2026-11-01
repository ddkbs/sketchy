import { execFile, type ExecFileException } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, basename, join } from "node:path";
import { setting } from "./env.js";

export type ExportFile = { name: string; text?: string; base64?: string };

/** Writes drawings exported from the viewer to disk; only local servers offer it. */
export interface ExportSink {
  /** Saves the file and returns its absolute path, or null if the user cancelled. */
  save(file: ExportFile): Promise<string | null>;
}

const exportDir = () => setting("SKETCHY_EXPORT_DIR") || join(homedir(), "Downloads");

// The name comes from the viewer; keep only a plain file name.
const safeName = (name: string) => basename(name).replace(/[^\w.-]/g, "-") || "sketch";

const contents = ({ text, base64 }: ExportFile) =>
  text !== undefined ? text : Buffer.from(base64 ?? "", "base64");

/** Saves into ~/Downloads (or SKETCHY_EXPORT_DIR) without overwriting earlier files. */
export function downloadsSink(dir = exportDir()): ExportSink {
  return {
    async save(file) {
      await mkdir(dir, { recursive: true });
      const safe = safeName(file.name);
      const ext = extname(safe);
      const stem = safe.slice(0, safe.length - ext.length);
      for (let n = 1; ; n++) {
        const path = join(dir, n === 1 ? safe : `${stem}-${n}${ext}`);
        try {
          await writeFile(path, contents(file), { flag: "wx" });
          return path;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST" || n > 999) throw error;
        }
      }
    },
  };
}

/**
 * Asks where to save with the system's save dialog; the dialog itself confirms
 * overwriting. Falls back to `fallback` where no dialog is available.
 */
export function dialogSink(fallback = downloadsSink()): ExportSink {
  return {
    async save(file) {
      const name = safeName(file.name);
      const path = await askSavePath(name, exportDir());
      if (path === undefined) return fallback.save(file);
      if (path === null) return null;
      await writeFile(path, contents(file));
      return path;
    },
  };
}

/** The chosen path, null if cancelled, undefined if no dialog could be shown. */
async function askSavePath(name: string, dir: string): Promise<string | null | undefined> {
  if (process.platform === "darwin") {
    const script = [
      "on run argv",
      "activate",
      'set f to choose file name with prompt "Save drawing" default name (item 1 of argv) default location (POSIX file (item 2 of argv))',
      "return POSIX path of f",
      "end run",
    ];
    const result = await run("osascript", [...script.flatMap((l) => ["-e", l]), name, dir]);
    // AppleScript reports a cancelled dialog as error -128.
    if (result.error) return /-128/.test(result.stderr) ? null : undefined;
    return result.stdout.trim() || null;
  }
  if (process.platform === "win32") {
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "$d = New-Object System.Windows.Forms.SaveFileDialog",
      "$d.FileName = $env:SKETCHY_SAVE_NAME",
      "$d.InitialDirectory = $env:SKETCHY_SAVE_DIR",
      "$d.Filter = ($env:SKETCHY_SAVE_EXT.ToUpper() + '|*.' + $env:SKETCHY_SAVE_EXT)",
      "if ($d.ShowDialog() -eq 'OK') { $d.FileName }",
    ].join("; ");
    const result = await run("powershell", ["-NoProfile", "-STA", "-Command", script], {
      SKETCHY_SAVE_NAME: name,
      SKETCHY_SAVE_DIR: dir,
      SKETCHY_SAVE_EXT: extname(name).slice(1) || "svg",
    });
    if (result.error) return undefined;
    return result.stdout.trim() || null;
  }
  const result = await run("zenity", [
    "--file-selection",
    "--save",
    "--confirm-overwrite",
    `--filename=${join(dir, name)}`,
  ]);
  // zenity exits with 1 on cancel; a missing binary means no dialog at all.
  if (result.error) return (result.error.code as unknown) === 1 ? null : undefined;
  return result.stdout.trim() || null;
}

function run(
  command: string,
  args: string[],
  env: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string; error?: ExecFileException }> {
  return new Promise((resolve) => {
    execFile(command, args, { env: { ...process.env, ...env } }, (error, stdout, stderr) =>
      resolve({ stdout, stderr, error: error ?? undefined }),
    );
  });
}
