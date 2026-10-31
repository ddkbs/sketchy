import { AnimatePresence, motion, useInView } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { prettyArgs, SCENARIOS, summary, type Scenario } from "./scenarios";
import { Stage, wait } from "./stage";

type Phase = "idle" | "typing" | "thinking" | "intro" | "tool" | "drawing" | "steps" | "done";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * A simulated chat: the prompt is typed, Claude answers and calls `sketch`, and the real Sketchy
 * renderer draws the laid-out scene element by element, then walks through its steps.
 */
export function Demo() {
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [introWords, setIntroWords] = useState(0);
  const [lines, setLines] = useState(0);
  const [drawn, setDrawn] = useState(0);
  const [step, setStep] = useState<number | undefined>(undefined);
  const stageRoot = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { margin: "-120px" });
  const scenario = SCENARIOS[active];
  const code = prettyArgs(scenario.args);

  const select = useCallback((i: number) => {
    setActive(i);
    setRun((r) => r + 1);
  }, []);

  useLayoutEffect(() => {
    stage.current = new Stage(stageRoot.current!, scenario.scene);
  }, [scenario, run]);

  useEffect(() => {
    if (!inView) return;
    let live = true;
    const alive = () => live;
    const s = stage.current!;
    void (async () => {
      setPhase("typing");
      setTyped("");
      setIntroWords(0);
      setLines(0);
      setDrawn(0);
      setStep(undefined);
      s.hide();
      await wait(500);
      for (let i = 1; i <= scenario.prompt.length && live; i++) {
        setTyped(scenario.prompt.slice(0, i));
        await wait(24 + Math.random() * 30);
      }
      await wait(350);
      if (!live) return;
      setPhase("thinking");
      await wait(900);
      if (!live) return;
      setPhase("intro");
      const words = scenario.intro.split(" ").length;
      for (let i = 1; i <= words && live; i++) {
        setIntroWords(i);
        await wait(38);
      }
      await wait(300);
      if (!live) return;
      setPhase("tool");
      for (let i = 1; i <= code.length && live; i++) {
        setLines(i);
        await wait(code.length > 60 ? 16 : 26);
      }
      await wait(250);
      if (!live) return;
      setPhase("drawing");
      let count = 0;
      const tick = setInterval(() => {
        count = Math.min(s.count, count + 1);
        setDrawn(count);
      }, 140);
      await s.build(alive);
      clearInterval(tick);
      setDrawn(s.count);
      if (!live) return;
      if (scenario.scene.steps.length) {
        setPhase("steps");
        for (let i = 0; i < scenario.scene.steps.length && live; i++) {
          setStep(i);
          s.step(i);
          await wait(2300);
        }
        if (!live) return;
        setStep(undefined);
        s.step(undefined);
      }
      setPhase("done");
      await wait(4200);
      if (live) select((active + 1) % SCENARIOS.length);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, active, run]);

  const status =
    phase === "drawing"
      ? `drawing ${drawn}/${stage.current?.count ?? 0}`
      : phase === "steps"
        ? `step ${(step ?? 0) + 1} of ${scenario.scene.steps.length}`
        : phase === "done"
          ? "interactive"
          : phase === "tool"
            ? "receiving scene"
            : "waiting for a tool call";

  return (
    <div ref={box} className="relative">
      <div className="pointer-events-none absolute -inset-x-10 -top-16 bottom-1/3 rounded-[40px] bg-[radial-gradient(ellipse_at_50%_0%,rgb(255_229_138/0.14),transparent_70%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-panel shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        {/* Window chrome */}
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-[#ff5f57]/90" />
            <span className="size-3 rounded-full bg-[#febc2e]/90" />
            <span className="size-3 rounded-full bg-[#28c840]/90" />
          </div>
          <span className="font-mono text-[11px] tracking-wide text-faint">
            claude code — ~/projects
          </span>
          <span className="hidden items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-c-green shadow-[0_0_8px_var(--c-green)]" />
            sketchy · 22 tools
          </span>
        </div>

        {/* Scenario tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-2">
          <div className="flex min-w-0 overflow-x-auto">
            {SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => select(i)}
                className={`relative whitespace-nowrap px-3 py-3 font-mono text-[12.5px] transition-colors sm:px-4 ${
                  i === active ? "text-foreground" : "text-faint hover:text-muted-foreground"
                }`}
              >
                {s.tab}
                {i === active && (
                  <motion.span
                    layoutId="tab"
                    className="absolute inset-x-3 bottom-0 h-px bg-marker sm:inset-x-4"
                  />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => select(active)}
            className="mr-2 shrink-0 whitespace-nowrap rounded-md border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            ↻ Replay
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Chat */}
          <div className="flex h-[520px] flex-col border-b border-border lg:h-[600px] lg:border-b-0 lg:border-r">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-5">
              <AnimatePresence mode="popLayout">
                {phase !== "typing" && phase !== "idle" && (
                  <motion.div
                    key={`q${run}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="flex flex-col items-end gap-1.5"
                  >
                    {scenario.attachment && (
                      <span className="rounded-md border border-border-strong bg-panel-2 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                        📎 {scenario.attachment}
                      </span>
                    )}
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.07] px-3.5 py-2 text-[14px] text-foreground">
                      {scenario.prompt}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {phase === "thinking" && (
                <span className="text-shimmer w-fit font-mono text-[12.5px]">Thinking…</span>
              )}
              {introWords > 0 && (
                <p className="text-[14px] leading-relaxed text-foreground/90">
                  {scenario.intro.split(" ").slice(0, introWords).join(" ")}
                </p>
              )}
              {lines > 0 && (
                <ToolCall code={code} lines={lines} phase={phase} scenario={scenario} />
              )}
              {phase === "done" && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[14px] leading-relaxed text-foreground/90"
                >
                  {scenario.outro}
                </motion.p>
              )}
            </div>
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-xl border border-border-strong bg-background/60 px-3.5 py-2.5 text-[14px]">
                <span className={phase === "typing" ? "text-foreground" : "text-faint"}>
                  {phase === "typing" ? typed : "Reply…"}
                  {phase === "typing" && (
                    <span className="ml-px inline-block h-4 w-[2px] translate-y-[3px] animate-blink bg-marker" />
                  )}
                </span>
                <span className="ml-auto grid size-7 place-items-center rounded-lg bg-white/90 text-[13px] text-black">
                  ↑
                </span>
              </div>
            </div>
          </div>

          {/* Viewer */}
          <div className="flex h-[520px] flex-col bg-panel-2/60 lg:h-[600px]">
            <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[11px] text-faint">
              <span>ui://sketchy/viewer.html</span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={`size-1.5 rounded-full ${
                    phase === "drawing" || phase === "tool"
                      ? "animate-pulse bg-marker"
                      : phase === "steps" || phase === "done"
                        ? "bg-c-green"
                        : "bg-faint"
                  }`}
                />
                {status}
              </span>
            </div>
            <div className="relative mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-paper">
              <div ref={stageRoot} className="sketch-stage min-h-0 flex-1 p-2" />
              <StepCaption scenario={scenario} step={step} />
              {phase !== "drawing" && phase !== "steps" && phase !== "done" && (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="font-hand text-[22px] text-ink/30">
                    {phase === "tool" ? "laying it out…" : "the drawing appears here"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCall({
  code,
  lines,
  phase,
  scenario,
}: {
  code: string[];
  lines: number;
  phase: Phase;
  scenario: Scenario;
}) {
  const scroller = useRef<HTMLPreElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);
  const finished = phase !== "tool";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-strong bg-background/70"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2 font-mono text-[11.5px]">
        <span className="text-muted-foreground">
          <span className="text-faint">⚒</span> sketchy ·{" "}
          <span className="text-foreground">sketch</span>
        </span>
        {finished ? (
          <span className="text-c-green">✓ {summary(scenario.scene)}</span>
        ) : (
          <span className="text-shimmer">streaming arguments</span>
        )}
      </div>
      <pre
        ref={scroller}
        className="h-[150px] overflow-hidden px-3 py-2 font-mono text-[11px] leading-[1.6] lg:h-[190px]"
      >
        {code.slice(0, lines).map((line, i) => (
          <div key={i}>{highlight(line)}</div>
        ))}
      </pre>
      <div className="border-t border-border px-3 py-1.5 font-mono text-[10.5px] text-faint">
        no coordinates · laid out by elkjs in {scenario.ms} ms
      </div>
    </motion.div>
  );
}

/** Minimal JSON colouring: keys, strings and the rest. */
function highlight(line: string): ReactNode {
  const out: ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    out.push(
      <span key={`p${m.index}`} className="text-faint">
        {line.slice(last, m.index)}
      </span>,
    );
    out.push(
      <span key={`t${m.index}`} className={m[2] ? "text-c-blue" : "text-[#e9d58a]"}>
        {m[1]}
      </span>,
    );
    if (m[2])
      out.push(
        <span key={`c${m.index}`} className="text-faint">
          {m[2]}
        </span>,
      );
    last = re.lastIndex;
  }
  out.push(
    <span key="end" className="text-faint">
      {line.slice(last)}
    </span>,
  );
  return out;
}

function StepCaption({ scenario, step }: { scenario: Scenario; step: number | undefined }) {
  const steps = scenario.scene.steps;
  if (!steps.length) return null;
  const current = step === undefined ? undefined : steps[step];
  return (
    <div className="flex min-h-[64px] items-center gap-3 border-t border-dashed border-black/15 px-4 py-2.5 text-ink">
      <div className="min-w-0 flex-1 font-hand">
        <AnimatePresence mode="wait">
          <motion.div
            key={step ?? "all"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {current ? (
              <>
                <span className="font-bold text-pen">
                  {step! + 1}. {current.title}
                </span>{" "}
                <span className="text-[15px] text-ink/80">{current.text}</span>
              </>
            ) : (
              <span className="text-[15px] text-ink/60">Walk through {steps.length} steps ›</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`size-2 rounded-full border border-ink/60 ${i === step ? "bg-ink" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
