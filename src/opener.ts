import { execFile } from "node:child_process";
import { EDITORS } from "./layout/links.js";

/** Opens editor deep links on this computer; only local servers offer it. */
export type Opener = (url: string) => Promise<void>;

const EDITOR_LINK = new RegExp(`^(${EDITORS.join("|")})://file/[^\\s]+$`);

/** Only the file links Sketchy builds itself, never arbitrary commands or URLs. */
export function isEditorLink(url: string): boolean {
  return EDITOR_LINK.test(url);
}

/**
 * Hands the link to the operating system, which starts the registered editor.
 * Hosts often refuse custom schemes such as cursor:// in their own link opener.
 */
export function systemOpener(): Opener {
  return (url) =>
    new Promise((resolve, reject) => {
      if (!isEditorLink(url)) return reject(new Error("Not an editor link."));
      // No shell anywhere, so the link cannot inject commands.
      const [cmd, args] =
        process.platform === "darwin"
          ? ["open", [url]]
          : process.platform === "win32"
            ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
            : ["xdg-open", [url]];
      execFile(cmd, args, (error) => (error ? reject(error) : resolve()));
    });
}
