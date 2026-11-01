import { useEffect, useState } from "react";

export const REPO = "ddkbs/sketchy";
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases/latest`;

export type Platform = "darwin-arm64" | "win32-x64" | "linux-x64";
export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "darwin-arm64", label: "macOS" },
  { id: "win32-x64", label: "Windows" },
  { id: "linux-x64", label: "Linux" },
];

export type RepoInfo = {
  stars?: number;
  version?: string;
  assets: Partial<Record<Platform, string>>;
  /** The chat skill (sketchy-skill-<version>.zip). */
  skill?: string;
};

/** One shared fetch per page load: release assets and star count from the public GitHub API. */
let repoInfo: Promise<RepoInfo> | null = null;
function loadRepoInfo(): Promise<RepoInfo> {
  const get = (path: string) =>
    fetch(`https://api.github.com/repos/${REPO}${path}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  repoInfo ??= Promise.all([get(""), get("/releases/latest")]).then(([repo, release]) => {
    const files: { name: string; browser_download_url: string }[] = release?.assets ?? [];
    const assets: RepoInfo["assets"] = {};
    for (const { id } of PLATFORMS) {
      assets[id] = files.find((f) => f.name.endsWith(`-${id}.mcpb`))?.browser_download_url;
    }
    return {
      stars: typeof repo?.stargazers_count === "number" ? repo.stargazers_count : undefined,
      version: release?.tag_name ? String(release.tag_name).replace(/^v/, "") : undefined,
      assets,
      skill: files.find((f) => /^sketchy-skill-.*\.zip$/.test(f.name))?.browser_download_url,
    };
  });
  return repoInfo;
}

export function useRepoInfo(): RepoInfo {
  const [info, setInfo] = useState<RepoInfo>({ assets: {} });
  useEffect(() => {
    let live = true;
    void loadRepoInfo().then((i) => live && setInfo(i));
    return () => {
      live = false;
    };
  }, []);
  return info;
}

/** Best guess at the visitor's platform, for the primary download button. */
export function detectPlatform(): Platform {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/Windows/i.test(ua)) return "win32-x64";
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return "linux-x64";
  return "darwin-arm64";
}

/** Download links for the visitor's platform; the release page until assets load. */
export function useDownload(): {
  href: string;
  label: string;
  skillHref: string;
  version?: string;
} {
  const { assets, skill, version } = useRepoInfo();
  const platform = detectPlatform();
  return {
    href: assets[platform] ?? RELEASES_URL,
    label: PLATFORMS.find((p) => p.id === platform)!.label,
    skillHref: skill ?? RELEASES_URL,
    version,
  };
}

export function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}
