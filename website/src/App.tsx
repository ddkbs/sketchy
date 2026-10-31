import { motion } from "motion/react";
import { CAPABILITIES, TAGLINE } from "./shared/content";
import { ChatDemo } from "./shared/demo/ChatDemo";
import { Docs } from "./shared/Docs";
import { useDownload } from "./shared/lib";
import { LogoMark } from "./shared/Logo";
import { GithubIcon, Nav, Stars } from "./shared/Nav";
import { REPO_URL } from "./shared/lib";
import DecryptedText from "./vendor/DecryptedText";
import Magnet from "./vendor/Magnet";
import ShinyText from "./vendor/ShinyText";
import TargetCursor from "./vendor/TargetCursor";
import Topography from "./vendor/Topography";

const ease = [0.22, 1, 0.36, 1] as const;
const up = (delay: number) => ({
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.9, delay, ease },
});

const HOME = "/";
const DOCS = "/docs/";

/** Download: solid white, magnetic, with a red glow and a corner-bracket frame on hover. */
function DownloadButton({ size = "lg" }: { size?: "lg" | "sm" }) {
  const { href, label } = useDownload();
  const lg = size === "lg";
  return (
    <Magnet padding={lg ? 70 : 30} magnetStrength={lg ? 5 : 8}>
      <a
        href={href}
        className={`cursor-target group relative inline-flex items-center gap-2.5 overflow-hidden rounded-lg bg-white font-medium text-black transition-shadow duration-500 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_12px_50px_-6px_var(--accent)] ${
          lg ? "h-12 px-6 text-[15px]" : "h-8 px-3.5 text-[13px]"
        }`}
      >
        <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-[420%]" />
        <svg
          viewBox="0 0 24 24"
          className={lg ? "size-[18px]" : "size-4"}
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
        {lg ? `Download for ${label}` : "Download"}
      </a>
    </Magnet>
  );
}

function GithubButton() {
  return (
    <Magnet padding={70} magnetStrength={5}>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="cursor-target group inline-flex h-12 items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-5 text-[15px] font-medium backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/[0.08]"
      >
        <GithubIcon size={17} />
        <ShinyText text="Star on GitHub" color="#d4d4d8" shineColor="#ffffff" speed={3} />
        <Stars className="rounded bg-white/10 px-1.5 py-0.5 text-[12px] text-muted-foreground" />
      </a>
    </Magnet>
  );
}

function Landing() {
  const { version } = useDownload();
  return (
    <>
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <Topography color="#ef5444" className="!absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_45%_at_50%_42%,rgb(6_6_7/0.82),transparent_75%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-b from-transparent to-background" />

        <div className="mx-auto flex min-h-[100svh] max-w-[1180px] flex-col items-center justify-center px-5 pb-24 pt-28 text-center">
          <motion.a
            {...up(0)}
            href={DOCS}
            className="cursor-target mb-8 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/40 py-1 pl-1 pr-3.5 font-mono text-[12px] text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
          >
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">
              v{version ?? "0.1.0"}
            </span>
            <DecryptedText
              text="open-source MCP server for Claude"
              animateOn="view"
              sequential
              speed={35}
              className="text-muted-foreground"
              encryptedClassName="text-accent/70"
            />
          </motion.a>

          <motion.h1
            {...up(0.1)}
            className="text-[clamp(46px,8vw,100px)] font-semibold leading-[0.95] tracking-[-0.055em]"
          >
            Claude explains.
            <br />
            <span className="bg-gradient-to-b from-[#ff8a7d] via-accent to-[#b8281b] bg-clip-text text-transparent">
              Sketchy draws.
            </span>
          </motion.h1>
          <motion.p
            {...up(0.2)}
            className="mt-7 max-w-[54ch] text-[clamp(15px,1.5vw,18px)] leading-relaxed text-muted-foreground"
          >
            {TAGLINE}
          </motion.p>
          <motion.div
            {...up(0.3)}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <DownloadButton />
            <GithubButton />
          </motion.div>
          <motion.p {...up(0.4)} className="mt-6 font-mono text-[11.5px] tracking-wide text-faint">
            MIT · macOS · Windows · Linux · runs locally
          </motion.p>
        </div>
      </section>

      <section className="relative mx-auto -mt-16 max-w-[1000px] px-4">
        <div className="mb-4 flex items-end justify-between px-1">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Live demo
            </div>
            <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
              Pick a prompt. Watch it draw.
            </div>
          </div>
          <div className="hidden font-mono text-[11px] text-faint sm:block">
            real Sketchy output, replayed
          </div>
        </div>
        <ChatDemo />
      </section>

      <section className="mx-auto mt-24 max-w-[1000px] px-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="cursor-target group bg-background p-5 transition-colors hover:bg-white/[0.02]"
            >
              <div className="mb-4 grid size-9 place-items-center rounded-lg border border-border-strong text-muted-foreground transition-colors group-hover:border-accent/50 group-hover:text-accent">
                {c.icon}
              </div>
              <div className="text-[15px] font-medium">{c.title}</div>
              <div className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[1000px] px-4 pb-10">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-white/[0.04] to-transparent px-6 py-14 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent to-transparent" />
          <h2 className="text-[clamp(28px,4vw,44px)] font-semibold tracking-[-0.04em]">
            Ready in a minute.
          </h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-muted-foreground">
            One-click install for the Claude desktop app. Everything else is in the docs.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <DownloadButton />
            <Magnet padding={70} magnetStrength={5}>
              <a
                href={DOCS}
                className="cursor-target inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-5 text-[15px] font-medium transition-colors hover:border-white/30"
              >
                Read the docs <span className="text-muted-foreground">→</span>
              </a>
            </Magnet>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-[1000px] flex-col items-center justify-between gap-3 px-5 py-10 text-[13px] text-faint sm:flex-row">
      <span className="flex items-center gap-2">
        <LogoMark className="size-4 text-muted-foreground" /> Sketchy · MIT License
      </span>
      <span className="flex gap-5">
        <a href={DOCS} className="cursor-target hover:text-foreground">
          Docs
        </a>
        <a
          href={`${REPO_URL}/blob/main/CHANGELOG.md`}
          className="cursor-target hover:text-foreground"
        >
          Changelog
        </a>
        <a href={REPO_URL} className="cursor-target hover:text-foreground">
          GitHub
        </a>
      </span>
    </footer>
  );
}

export default function App({ page }: { page: "home" | "docs" }) {
  return (
    <>
      <TargetCursor targetSelector=".cursor-target" spinDuration={2.4} hideDefaultCursor />
      <Nav home={HOME} docs={DOCS} cta={<DownloadButton size="sm" />} />
      {page === "home" ? (
        <Landing />
      ) : (
        <>
          <div className="pointer-events-none fixed inset-0 -z-10 opacity-40">
            <Topography
              color="#ef5444"
              speed={0.12}
              mouseInteraction={false}
              intro={false}
              fog={0.6}
              brightness={0.6}
            />
          </div>
          <div className="pointer-events-none fixed inset-0 -z-10 bg-background/80" />
          <Docs />
          <Footer />
        </>
      )}
    </>
  );
}
