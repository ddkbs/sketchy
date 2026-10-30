import { createRequire } from "node:module";
import type { IconData } from "./scene/laid-out.js";

type IconSet = {
  prefix: string;
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number }>;
  aliases?: Record<string, { parent: string }>;
};

/**
 * Bundled icon sets: Lucide (line icons that match the sketch style) and
 * Simple Icons (technology logos for architecture diagrams).
 */
const SETS: Record<string, string> = {
  lucide: "@iconify-json/lucide/icons.json",
  "simple-icons": "@iconify-json/simple-icons/icons.json",
};

const cache = new Map<string, IconSet>();
const require = createRequire(import.meta.url);

function loadSet(prefix: string): IconSet | undefined {
  const path = SETS[prefix];
  if (!path) return undefined;
  let set = cache.get(prefix);
  if (!set) {
    set = require(path) as IconSet;
    cache.set(prefix, set);
  }
  return set;
}

/** Resolves "lucide:database", "simple-icons:react" or a bare Lucide name. */
export function resolveIcon(name: string): IconData | undefined {
  const [prefix, iconName] = name.includes(":") ? name.split(":", 2) : ["lucide", name];
  const set = loadSet(prefix!);
  if (!set || !iconName) return undefined;
  const key = set.icons[iconName] ? iconName : set.aliases?.[iconName]?.parent;
  const icon = key ? set.icons[key] : undefined;
  if (!icon) return undefined;
  return {
    body: icon.body,
    width: icon.width ?? set.width ?? 24,
    height: icon.height ?? set.height ?? 24,
  };
}

export function suggestIcons(query: string, limit = 8): string[] {
  const q = query.toLowerCase();
  const results: string[] = [];
  for (const prefix of Object.keys(SETS)) {
    const set = loadSet(prefix);
    if (!set) continue;
    for (const name of Object.keys(set.icons)) {
      if (name.includes(q)) results.push(`${prefix}:${name}`);
      if (results.length >= limit) return results;
    }
  }
  return results;
}
