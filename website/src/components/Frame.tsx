import type { ReactNode } from "react";
import { motion } from "motion/react";

export const ease = [0.22, 1, 0.36, 1] as const;

/** A "+" registration mark where dashed rails meet, like a technical drawing. */
export function Plus({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 11 11"
      className={`pointer-events-none absolute size-[11px] text-white/35 ${className}`}
      aria-hidden
    >
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Full-width section between the page rails, with a dashed top rule and registration marks. */
export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative scroll-mt-20 ${className}`}>
      <div className="dash-x absolute inset-x-0 top-0 h-px" />
      <Plus className="-left-[5px] -top-[5px]" />
      <Plus className="-right-[5px] -top-[5px]" />
      {children}
    </section>
  );
}

export function Eyebrow({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-faint">[{index}]</span>
      <span className="size-1 rounded-full bg-marker shadow-[0_0_8px_var(--marker)]" />
      {children}
    </div>
  );
}

export function SectionHeader({
  index,
  eyebrow,
  title,
  children,
  center,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  center?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease }}
      className={`flex flex-col gap-4 ${center ? "items-center text-center" : ""}`}
    >
      <Eyebrow index={index}>{eyebrow}</Eyebrow>
      <h2 className="text-gradient max-w-[22ch] text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.02] tracking-[-0.035em]">
        {title}
      </h2>
      {children && (
        <p className="max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground">{children}</p>
      )}
    </motion.div>
  );
}

/** Fade-up on first view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A hand-drawn marker stroke behind a word. */
export function Marker({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <svg
        viewBox="0 0 300 40"
        preserveAspectRatio="none"
        className="absolute -inset-x-[4%] bottom-[2%] -z-10 h-[38%] w-[108%]"
        aria-hidden
      >
        <motion.path
          d="M4 26 C 70 18, 160 30, 296 16"
          fill="none"
          stroke="var(--marker)"
          strokeWidth="22"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.7, ease }}
          opacity={0.9}
        />
      </svg>
      {children}
    </span>
  );
}
