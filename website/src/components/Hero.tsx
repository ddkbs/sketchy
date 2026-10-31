import { motion } from "motion/react";
import { Demo } from "../demo/Demo";
import { useRepoInfo } from "../lib";
import { FlickeringGrid, Spotlight } from "./Backgrounds";
import { DownloadButton, GithubButton } from "./Buttons";
import { ease, Marker } from "./Frame";

const up = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease },
});

export function Hero() {
  const { version } = useRepoInfo();
  return (
    <section id="top" className="relative overflow-hidden">
      <FlickeringGrid className="[mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black_20%,transparent_75%)]" />
      <Spotlight />
      <div className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-center px-5 pb-14 pt-16 text-center md:pt-24">
        <motion.a
          {...up(0)}
          href="#install"
          className="group mb-8 inline-flex items-center gap-2.5 rounded-md border border-border-strong bg-panel/80 py-1 pl-1 pr-3 text-[13px] text-foreground/90 backdrop-blur transition-colors hover:border-white/25"
        >
          <span className="rounded-[4px] bg-marker px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-widest text-black">
            New
          </span>
          Sketchy {version ?? "0.1.0"} for Claude
          <span className="hidden sm:inline"> — circuits, code and photos</span>
          <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </motion.a>
        <motion.h1
          {...up(0.08)}
          className="guard text-[clamp(44px,8.4vw,104px)] font-semibold leading-[0.95] tracking-[-0.05em]"
        >
          Claude explains.
          <br />
          <span className="isolate font-hand font-bold tracking-[-0.02em] [text-shadow:none]">
            <Marker>
              <span className="text-white">Sketchy draws.</span>
            </Marker>
          </span>
        </motion.h1>
        <motion.p
          {...up(0.16)}
          className="guard mt-7 max-w-[52ch] text-[clamp(16px,1.6vw,19px)] leading-relaxed text-muted-foreground"
        >
          An open-source MCP server that turns explanations into hand-drawn, interactive diagrams
          right inside the chat. Claude decides <em className="text-foreground not-italic">what</em>{" "}
          to draw, Sketchy decides <em className="text-foreground not-italic">where</em>.
        </motion.p>
        <motion.div {...up(0.24)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <DownloadButton />
          <GithubButton className="h-12 px-5 text-[15px]" />
        </motion.div>
        <motion.p {...up(0.32)} className="guard mt-5 font-mono text-[12px] text-muted-foreground">
          Free &amp; MIT licensed · macOS, Windows, Linux · runs locally
        </motion.p>
      </div>
      <motion.div
        id="demo"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4, ease }}
        className="relative z-10 mx-auto max-w-[1240px] scroll-mt-24 px-3 pb-20 md:px-8"
      >
        <Demo />
        <p className="mt-5 text-center font-mono text-xs text-faint">
          ↳ A replay of real Sketchy output: same server, same layout engine, same renderer.
        </p>
      </motion.div>
    </section>
  );
}
