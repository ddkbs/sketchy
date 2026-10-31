/**
 * The Sketchy mark: contour lines around a summit inside target brackets, echoing the
 * topographic background and the cursor. The summit takes the accent colour.
 */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden>
      <path
        d="M8 30V14a6 6 0 0 1 6-6h16M70 8h16a6 6 0 0 1 6 6v16M92 70v16a6 6 0 0 1-6 6H70M30 92H14a6 6 0 0 1-6-6V70"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M50 22c15 0 30 9 29 26s-12 30-30 30-28-11-28-27 14-29 29-29Z"
        stroke="currentColor"
        strokeOpacity=".45"
        strokeWidth="5"
      />
      <path
        d="M51 34c9 0 17 6 16 15s-8 17-17 17-15-7-15-15 7-17 16-17Z"
        stroke="currentColor"
        strokeOpacity=".75"
        strokeWidth="5"
      />
      <circle cx="51" cy="50" r="7.5" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <a
      href={href}
      className={`flex items-center gap-2 text-[18px] font-semibold tracking-[-0.03em] ${className}`}
    >
      <LogoMark className="size-6" />
      Sketchy
    </a>
  );
}
