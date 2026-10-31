import { useEffect, useState, type ReactNode } from "react";
import { formatStars, REPO_URL, useRepoInfo } from "./lib";
import { Logo } from "./Logo";

export function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/** Star count from the GitHub API, empty until the repository is public. */
export function Stars({ className = "" }: { className?: string }) {
  const { stars } = useRepoInfo();
  return stars ? (
    <span className={`font-mono tabular-nums ${className}`}>{formatStars(stars)}</span>
  ) : null;
}

export function Nav({ home, docs, cta }: { home: string; docs: string; cta?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
        <Logo href={home} className="cursor-target" />
        <nav className="flex items-center gap-1 text-[14px] text-muted-foreground">
          <a
            href={docs}
            className="cursor-target rounded-md px-3 py-1.5 transition-colors hover:text-foreground"
          >
            Docs
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="cursor-target flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors hover:text-foreground"
          >
            <GithubIcon size={15} />
            <span className="hidden sm:inline">GitHub</span>
            <Stars className="text-faint" />
          </a>
          {cta && <div className="ml-1 hidden sm:block">{cta}</div>}
        </nav>
      </div>
    </header>
  );
}
