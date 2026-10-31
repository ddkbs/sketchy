import {
  detectPlatform,
  formatStars,
  PLATFORMS,
  RELEASES_URL,
  REPO_URL,
  useRepoInfo,
} from "../lib";

export function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/** "Star on GitHub" with a light sweep on hover; the count is live from the GitHub API. */
export function GithubButton({ className = "" }: { className?: string }) {
  const { stars } = useRepoInfo();
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      className={`group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden whitespace-pre rounded-md border border-border-strong bg-[#111114] px-4 text-sm font-medium text-white transition-all duration-300 ease-out hover:bg-[#16161a] hover:ring-2 hover:ring-white/25 hover:ring-offset-2 hover:ring-offset-background ${className}`}
    >
      <span className="absolute right-0 -mt-12 h-32 w-8 translate-x-12 rotate-12 bg-white opacity-10 transition-all duration-1000 ease-out group-hover:-translate-x-48" />
      <GithubIcon />
      <span>Star</span>
      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-muted-foreground empty:hidden group-hover:text-marker">
        {stars ? `★ ${formatStars(stars)}` : ""}
      </span>
    </a>
  );
}

/** Downloads the .mcpb bundle for the visitor's platform (or opens the release page). */
export function DownloadButton({ className = "" }: { className?: string }) {
  const { assets } = useRepoInfo();
  const platform = detectPlatform();
  const label = PLATFORMS.find((p) => p.id === platform)!.label;
  return (
    <a
      href={assets[platform] ?? RELEASES_URL}
      className={`group relative inline-flex h-12 items-center justify-center gap-2.5 overflow-hidden rounded-md bg-white px-6 text-[15px] font-medium text-black shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_40px_-8px_rgba(255,229,138,0.45)] transition-all hover:bg-white/90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path
          d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Download for {label}
    </a>
  );
}
