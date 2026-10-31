import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogoMark } from "../Logo";
import { SCENARIOS, summary } from "./scenarios";
import { Stage, wait } from "./stage";

type Phase = "idle" | "typing" | "thinking" | "answer" | "tool" | "drawing" | "steps" | "done";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * A simulated chat around real Sketchy output: the prompt is typed, Claude answers, calls `sketch`,
 * and the actual renderer draws the laid-out scene element by element, then walks its steps.
 * Visitors pick a prompt below to run it themselves.
 */
export function ChatDemo({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [words, setWords] = useState(0);
  const [step, setStep] = useState<number | undefined>();
  const [touched, setTouched] = useState(false);
  const stageRoot = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { margin: "-80px" });
  const scenario = SCENARIOS[active];

  const pick = (i: number) => {
    setTouched(true);
    setActive(i);
    setRun((r) => r + 1);
  };

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
      setWords(0);
      setStep(undefined);
      s.hide();
      await wait(400);
      for (let i = 1; i <= scenario.prompt.length && live; i++) {
        setTyped(scenario.prompt.slice(0, i));
        await wait(22 + Math.random() * 28);
      }
      await wait(300);
      if (!live) return;
      setPhase("thinking");
      await wait(800);
      if (!live) return;
      setPhase("answer");
      const total = scenario.intro.split(" ").length;
      for (let i = 1; i <= total && live; i++) {
        setWords(i);
        await wait(34);
      }
      if (!live) return;
      setPhase("tool");
      await wait(700);
      if (!live) return;
      setPhase("drawing");
      await s.build(alive, 110);
      if (!live) return;
      if (scenario.scene.steps.length) {
        setPhase("steps");
        for (let i = 0; i < scenario.scene.steps.length && live; i++) {
          setStep(i);
          s.step(i);
          await wait(2200);
        }
        if (!live) return;
        setStep(undefined);
        s.step(undefined);
      }
      setPhase("done");
      await wait(5200);
      if (live && !touched) {
        setActive((a) => (a + 1) % SCENARIOS.length);
        setRun((r) => r + 1);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, active, run]);

  const sent = phase !== "idle" && phase !== "typing";
  const drawing = phase === "drawing" || phase === "steps" || phase === "done";
  const steps = scenario.scene.steps;
  const current = step === undefined ? undefined : steps[step];

  return (
    <div
      ref={box}
      className={`relative overflow-hidden rounded-2xl border border-border-strong bg-panel shadow-[0_30px_120px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl ${className}`}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <LogoMark className="size-4" />
          Sketchy
          <span className="text-faint">/</span>
          <span className="text-muted-foreground">new chat</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative size-1.5 rounded-full bg-accent" />
          </span>
          live demo
        </div>
      </div>

      {/* Conversation */}
      <div className="flex h-[560px] flex-col gap-3.5 p-4 sm:h-[620px] sm:p-5">
        <AnimatePresence>
          {sent && (
            <motion.div
              key={`q${run}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease }}
              className="flex justify-end"
            >
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-white/[0.08] px-3.5 py-2 text-[14px]">
                {scenario.prompt}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {sent && (
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border-strong bg-white/[0.04]">
              <span className="size-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            </span>
            <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-foreground/90">
              {phase === "thinking" ? (
                <span className="text-shimmer">Thinking…</span>
              ) : (
                scenario.intro.split(" ").slice(0, words).join(" ")
              )}
            </div>
          </div>
        )}

        {(phase === "tool" || drawing) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-[34px] flex w-fit items-center gap-2 rounded-full border border-border-strong bg-white/[0.03] px-3 py-1 font-mono text-[11.5px] text-muted-foreground"
          >
            {phase === "tool" ? (
              <span className="size-3 animate-spin rounded-full border-[1.5px] border-white/20 border-t-white" />
            ) : (
              <span className="text-accent">✓</span>
            )}
            <span className="text-foreground">sketch</span>
            <span className="text-faint">·</span>
            {phase === "tool" ? "laying out…" : `${summary(scenario.scene)} · ${scenario.ms} ms`}
          </motion.div>
        )}

        {/* The drawing, inline like in the real chat */}
        <div
          className={`relative ml-[34px] flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-paper transition-opacity duration-500 ${
            drawing ? "opacity-100" : "opacity-0"
          }`}
        >
          <div ref={stageRoot} className="sketch-stage min-h-0 flex-1 p-2" />
          {steps.length > 0 && (
            <div className="flex h-12 items-center gap-3 border-t border-black/10 bg-black/[0.025] px-4 text-[13px] text-[#1d1d1f]">
              <div className="min-w-0 flex-1 truncate">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={step ?? "all"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="block truncate"
                  >
                    {current ? (
                      <>
                        <span className="font-semibold text-[#e8452c]">
                          {step! + 1}/{steps.length} {current.title}
                        </span>
                        <span className="text-black/55"> — {current.text}</span>
                      </>
                    ) : (
                      <span className="text-black/45">Walk through {steps.length} steps</span>
                    )}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex shrink-0 gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-4 bg-[#1d1d1f]" : "w-1.5 bg-black/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ml-[34px] min-h-[20px] text-[14px] text-foreground/90">
          {phase === "done" && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {scenario.outro}
            </motion.span>
          )}
        </div>
      </div>

      {/* Composer with prompts to try */}
      <div className="border-t border-border p-3">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            Try
          </span>
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => pick(i)}
              className={`cursor-target rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
                i === active
                  ? "border-accent/60 bg-accent/10 text-foreground"
                  : "border-border-strong text-muted-foreground hover:border-white/25 hover:text-foreground"
              }`}
            >
              {s.chip}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border-strong bg-black/40 py-2 pl-3.5 pr-2 text-[14px]">
          <span className={`min-w-0 flex-1 truncate ${phase === "typing" ? "" : "text-faint"}`}>
            {phase === "typing" ? typed : "Ask anything worth drawing…"}
            {phase === "typing" && (
              <span className="ml-px inline-block h-4 w-[2px] translate-y-[3px] animate-blink bg-accent" />
            )}
          </span>
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-[15px] text-white">
            ↑
          </span>
        </div>
      </div>
    </div>
  );
}
