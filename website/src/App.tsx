import { Analytics } from "@vercel/analytics/react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { CAPABILITIES, TAGLINE } from "./shared/content";
import { ChatDemo } from "./shared/demo/ChatDemo";
import { Docs } from "./shared/Docs";
import {
  CLAUDE_CODE_INSTALL,
  CURSOR_INSTALL_URL,
  VSCODE_INSTALL_URL,
  useDownload,
} from "./shared/lib";
import { LogoMark } from "./shared/Logo";
import { GithubButton, Nav } from "./shared/Nav";
import { REPO_URL } from "./shared/lib";

import DecryptedText from "./vendor/DecryptedText";
import Magnet from "./vendor/Magnet";
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

/** Primary action: solid white, magnetic, with a red glow on hover. */
function DownloadButton({
  href,
  children,
  size = "lg",
}: {
  href: string;
  children: ReactNode;
  size?: "lg" | "sm";
}) {
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
        {children}
      </a>
    </Magnet>
  );
}

/** Secondary action: an outlined link that opens an editor's install prompt. */
function EditorButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="cursor-target inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 text-[14px] font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-white/[0.08]"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
      {children}
    </a>
  );
}

function HeroGithubButton() {
  return (
    <Magnet padding={70} magnetStrength={5}>
      <GithubButton className="h-12 px-5 text-[15px]" />
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
              text="open-source drawing for Claude"
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
            <DownloadButton href="#install">Get Sketchy</DownloadButton>
            <HeroGithubButton />
          </motion.div>
          <motion.p {...up(0.4)} className="mt-6 font-mono text-[11.5px] tracking-wide text-faint">
            MIT · in the Claude chat on web, desktop and mobile · in Claude Code
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

      <PhotoLabeling />

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

      <Install />
      <Footer />
    </>
  );
}

/** Core feature: real photos, labeled by a vision model on the user's computer. */
function PhotoLabeling() {
  return (
    <section className="mx-auto mt-24 max-w-[1000px] px-4">
      <div className="mb-6 grid gap-6 px-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-end">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Labeled photos
          </div>
          <h2 className="mt-1 text-[clamp(26px,3.4vw,36px)] font-semibold leading-tight tracking-[-0.035em]">
            Point at the real thing.
          </h2>
        </div>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Ask <span className="text-foreground">“Show me an Arduino Uno and label the pins.”</span>{" "}
          Claude finds an openly licensed photo, a vision model running on your computer
          (Florence-2) locates the parts and printed text, and Sketchy draws the callouts. Your
          images never leave your machine, and the credit is always shown.
        </p>
      </div>
      <figure className="overflow-hidden rounded-2xl border border-border bg-[#fffdf7]">
        <img
          src="/gallery/photo.jpg"
          alt="Photo of an Arduino Uno with hand-drawn labels for the reset button, digital pins, power pins and analog inputs"
          className="block w-full"
          loading="lazy"
        />
      </figure>
      <p className="mt-3 px-1 font-mono text-[11.5px] text-faint">
        real Sketchy output · comes with the extension for Claude Code
      </p>
    </section>
  );
}

type Mode = "chat" | "code";

const MODES: { id: Mode; title: string; hint: string; icon: ReactNode }[] = [
  {
    id: "chat",
    title: "In the chat",
    hint: "web · desktop · mobile",
    icon: (
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5Z"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "code",
    title: "While coding",
    hint: "Claude Code · editors",
    icon: <path d="m5 7 5 5-5 5M12.5 17H19" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

const swap = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(6px)" },
  transition: { duration: 0.35, ease },
};

/** Two cards; the active one gets a sliding highlight and a rotating accent border. */
function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      role="group"
      aria-label="Where you use Claude"
      className="mx-auto mt-7 grid max-w-[520px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 sm:gap-3"
    >
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            className="cursor-target group relative rounded-xl p-px text-left"
          >
            {active && (
              <motion.span
                layoutId="mode-highlight"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="mode-beam absolute inset-0 rounded-xl"
              />
            )}
            <span
              className={`relative flex h-full items-center gap-3 rounded-[11px] px-3 py-3 transition-colors duration-300 sm:px-4 ${
                active ? "bg-[#111114]" : "group-hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`hidden size-9 shrink-0 sm:grid place-items-center rounded-lg border transition-all duration-300 ${
                  active
                    ? "border-accent/40 bg-accent/15 text-accent shadow-[0_0_24px_-4px_var(--accent)]"
                    : "border-white/10 text-muted-foreground group-hover:-rotate-6 group-hover:text-foreground"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden
                >
                  {m.icon}
                </svg>
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[14.5px] font-medium transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {m.title}
                </span>
                <span className="block truncate font-mono text-[11px] text-faint">{m.hint}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Two ways in: the skill for the chat, the extension for coding. */
function Install() {
  const { href, label, skillHref } = useDownload();
  const [mode, setMode] = useState<Mode>("chat");
  return (
    <section id="install" className="mx-auto mt-24 max-w-[1000px] scroll-mt-24 px-4 pb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-white/[0.04] to-transparent px-6 py-14 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <h2 className="text-[clamp(28px,4vw,44px)] font-semibold tracking-[-0.04em]">
          Ready in a minute.
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-muted-foreground">Where do you use Claude?</p>
        <ModePicker mode={mode} onChange={setMode} />

        <AnimatePresence mode="wait" initial={false}>
          {mode === "chat" ? (
            <motion.div key="chat" {...swap} className="mx-auto mt-8 max-w-[520px]">
              <ol className="space-y-2 text-left text-[15px] text-muted-foreground">
                <li>
                  <span className="mr-2 font-mono text-accent">1</span>Download the Sketchy skill.
                </li>
                <li>
                  <span className="mr-2 font-mono text-accent">2</span>In Claude, open{" "}
                  <span className="text-foreground">Settings → Capabilities → Skills</span> and
                  upload it.
                </li>
                <li>
                  <span className="mr-2 font-mono text-accent">3</span>Ask Claude to explain
                  something. The drawing appears right in the chat.
                </li>
              </ol>
              <div className="mt-8 flex justify-center">
                <DownloadButton href={skillHref}>Download the skill</DownloadButton>
              </div>
              <p className="mt-4 font-mono text-[11.5px] text-faint">
                Web, desktop and mobile · no server · updates itself
              </p>
            </motion.div>
          ) : (
            <motion.div key="code" {...swap} className="mx-auto mt-8 max-w-[620px]">
              <p className="text-[15px] text-muted-foreground">
                The extension runs on your computer and adds photo labeling, SVG and PNG export and
                click-to-open files. Install it, then start a session in the{" "}
                <span className="text-foreground">Code</span> tab.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <DownloadButton href={href}>Download for {label}</DownloadButton>
              </div>
              <p className="mt-8 text-[13.5px] text-muted-foreground">
                In Cursor or VS Code, one click (needs Node.js):
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <EditorButton href={CURSOR_INSTALL_URL}>Add to Cursor</EditorButton>
                <EditorButton href={VSCODE_INSTALL_URL}>Add to VS Code</EditorButton>
              </div>
              <p className="mt-8 text-[13.5px] text-muted-foreground">
                Claude Code in the terminal:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-black/40 p-4 text-left font-mono text-[12.5px] leading-relaxed text-muted-foreground">
                {CLAUDE_CODE_INSTALL}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
        <a
          href={DOCS}
          className="cursor-target mt-8 inline-block text-[14px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Read the docs →
        </a>
      </div>
    </section>
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
        <a href="https://davidkubus.dev/impressum" className="cursor-target hover:text-foreground">
          Impressum
        </a>
        <a
          href="https://davidkubus.dev/datenschutz"
          className="cursor-target hover:text-foreground"
        >
          Datenschutz
        </a>
      </span>
    </footer>
  );
}

export default function App({ page }: { page: "home" | "docs" }) {
  return (
    <>
      <Analytics />
      <TargetCursor targetSelector=".cursor-target" spinDuration={2.4} hideDefaultCursor />
      <Nav
        home={HOME}
        docs={DOCS}
        cta={
          <DownloadButton href={`${HOME}#install`} size="sm">
            Install
          </DownloadButton>
        }
      />
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
