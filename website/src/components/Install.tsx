import { useState } from "react";
import { PLATFORMS, RELEASES_URL, REPO_URL, useRepoInfo } from "../lib";
import { FlickeringGrid } from "./Backgrounds";
import { DownloadButton, GithubButton, GithubIcon } from "./Buttons";
import { Reveal, Section, SectionHeader } from "./Frame";
import { Logo } from "./Nav";

const STEPS = [
  ["Download", "Get the .mcpb bundle for your platform."],
  ["Install", "Double-click it, or drag it into Claude → Settings → Extensions."],
  ["Ask", "Open the Code tab and ask something worth drawing."],
] as const;

const CONFIG = `{
  "mcpServers": {
    "sketchy": {
      "command": "node",
      "args": ["/path/to/sketchy/dist/index.js"]
    }
  }
}`;

export function Install() {
  const { assets, version } = useRepoInfo();
  const [copied, setCopied] = useState(false);
  return (
    <Section id="install" className="px-5 py-24 md:px-12">
      <SectionHeader index="04" eyebrow="Install" title="Up and drawing in a minute.">
        Sketchy ships as a one-click extension for the Claude desktop app. Drawings appear in Claude
        Code sessions today; support for the regular chat is on the way.
      </SectionHeader>
      <div className="mt-14 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Reveal className="rounded-2xl border border-border-strong bg-panel p-6">
          <ol className="flex flex-col gap-5">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border-strong font-mono text-[12px] text-marker">
                  {i + 1}
                </span>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-[14.5px] text-muted-foreground">{body}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-7 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <a
                key={p.id}
                href={assets[p.id] ?? RELEASES_URL}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-background px-3.5 font-mono text-[12.5px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
              >
                ↓ {p.label}
                <span className="text-faint">{p.id.split("-")[1]}</span>
              </a>
            ))}
          </div>
          <p className="mt-4 font-mono text-[11.5px] text-faint">
            {version ? `v${version} · ` : ""}photo labeling downloads its model on first use (~280
            MB)
          </p>
        </Reveal>
        <Reveal
          delay={0.08}
          className="flex flex-col rounded-2xl border border-border-strong bg-panel"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-[11.5px] text-muted-foreground">
            <span>Any MCP Apps client</span>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(CONFIG);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-faint transition-colors hover:text-foreground"
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
          <pre className="flex-1 overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-[#e9d58a]">
            {CONFIG}
          </pre>
        </Reveal>
      </div>
    </Section>
  );
}

export function Cta() {
  return (
    <Section className="relative overflow-hidden px-5 py-28 text-center md:px-12">
      <FlickeringGrid
        rate={0.4}
        className="[mask-image:radial-gradient(ellipse_50%_70%_at_50%_50%,black,transparent)]"
      />
      <div className="relative flex flex-col items-center gap-6">
        <h2 className="guard text-[clamp(36px,5.6vw,68px)] font-semibold leading-[1] tracking-[-0.045em]">
          Stop imagining the diagram.
          <br />
          <span className="font-hand font-bold text-marker [text-shadow:none]">
            Just ask for it.
          </span>
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <DownloadButton />
          <GithubButton className="h-12 px-5 text-[15px]" />
        </div>
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="relative">
      <div className="dash-x absolute inset-x-0 top-0 h-px" />
      <div className="flex flex-col items-center justify-between gap-4 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row md:px-12">
        <Logo />
        <div className="flex items-center gap-5">
          <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-foreground">
            MIT License
          </a>
          <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} className="hover:text-foreground">
            Changelog
          </a>
          <a href={REPO_URL} className="flex items-center gap-1.5 hover:text-foreground">
            <GithubIcon size={14} /> ddkbs/sketchy
          </a>
        </div>
      </div>
    </footer>
  );
}
