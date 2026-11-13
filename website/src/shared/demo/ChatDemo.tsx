import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { LogoMark } from "../Logo";
import { SCENARIOS, summary } from "./scenarios";
import type { LaidOutScene } from "../../../../src/scene/laid-out.js";
import { Stage } from "./stage";

type Phase = "idle" | "typing" | "thinking" | "answer" | "tool" | "drawing" | "steps" | "done";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * A chat around real Sketchy output: the prompt, Claude's answer, the `sketch` call and the
 * drawing from the actual renderer, all shown at once. Visitors pick a prompt below and click
 * through the drawing's steps themselves.
 */
export function ChatDemo({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState<number | undefined>();
  const [focused, setFocused] = useState<string | undefined>();
  const stageRoot = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const scenario = SCENARIOS[active];
  // Nothing plays by itself any more: the conversation is always finished.
  const phase = "done" as Phase;
  const typed = "";
  const words = scenario.intro.split(" ").length;

  const pick = (i: number) => {
    setActive(i);
    setStep(undefined);
    setFocused(undefined);
  };

  /** Shows one step, or the whole drawing for `undefined`. */
  const show = (index: number | undefined) => {
    setFocused(undefined);
    setStep(index);
    stage.current?.step(index);
  };
  /** Overview, step 1, step 2, …, back to the overview. */
  const next = () => {
    const last = scenario.scene.steps.length - 1;
    show(step === undefined || focused ? 0 : step >= last ? undefined : step + 1);
  };
  /** A click on a box circles it; a second click, or one beside it, shows everything again. */
  const focus = (id: string | undefined) => {
    setStep(undefined);
    setFocused(id);
    stage.current?.focus(id);
  };

  useLayoutEffect(() => {
    const s = new Stage(stageRoot.current!, scenario.scene);
    s.showAll();
    s.onPick((id) =>
      setFocused((now) => {
        const next = now === id ? undefined : id;
        setStep(undefined);
        s.focus(next);
        return next;
      }),
    );
    stage.current = s;
  }, [scenario]);

  const sent = phase !== "idle" && phase !== "typing";
  const drawing = phase === "drawing" || phase === "steps" || phase === "done";
  const steps = scenario.scene.steps;
  const current = step === undefined ? undefined : steps[step];
  const about = focused ? describe(scenario.scene, focused) : undefined;

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
              key={`q${active}`}
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
          <div
            ref={stageRoot}
            onClick={() => focused && focus(undefined)}
            className="sketch-stage min-h-0 flex-1 p-2"
          />
          {
            <button
              type="button"
              onClick={() => (steps.length > 0 ? next() : focus(undefined))}
              aria-label={
                steps.length === 0
                  ? "Show the whole drawing"
                  : step === undefined
                    ? "Start the walkthrough"
                    : "Next step"
              }
              className="cursor-target flex h-12 w-full items-center gap-3 border-t border-black/10 bg-black/[0.025] px-4 text-left text-[13px] text-[#1d1d1f] transition-colors hover:bg-black/[0.05]"
            >
              <div className="min-w-0 flex-1 truncate">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={focused ? `f-${focused}` : (step ?? "all")}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="block truncate"
                  >
                    {about ? (
                      <>
                        <span className="font-semibold text-[#e8452c]">{about.name}</span>
                        <span className="text-black/55"> — {about.text}</span>
                      </>
                    ) : current ? (
                      <>
                        <span className="font-semibold text-[#e8452c]">
                          {step! + 1}/{steps.length} {current.title}
                        </span>
                        <span className="text-black/55"> — {current.text}</span>
                      </>
                    ) : (
                      <span className="text-black/45">
                        {steps.length
                          ? `Click a box, or walk through ${steps.length} steps →`
                          : "Click a box to see what it does"}
                      </span>
                    )}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="flex shrink-0 gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    role="button"
                    aria-label={`Step ${i + 1}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      show(i === step ? undefined : i);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-4 bg-[#1d1d1f]" : "w-1.5 bg-black/20 hover:bg-black/40"
                    }`}
                  />
                ))}
              </div>
            </button>
          }
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

type Described = { name: string; text: string };

/**
 * What the bar says about a clicked element: its own description, else the step that explains
 * it, else what it is connected to.
 */
function describe(scene: LaidOutScene, id: string): Described {
  const node = scene.nodes.find((n) => n.id === id) as
    (LaidOutScene["nodes"][number] & { description?: string }) | undefined;
  const part = scene.parts.find((p) => p.id === id);
  const name = node?.label ?? part?.label ?? id;
  if (node?.description) return { name, text: node.description };
  const at = scene.steps.findIndex((s) => s.highlight.includes(id));
  if (at >= 0) {
    const s = scene.steps[at]!;
    return { name, text: `step ${at + 1}, ${s.title}: ${s.text ?? ""}`.trim() };
  }
  const labelOf = (other: string) =>
    scene.nodes.find((n) => n.id === other)?.label ??
    scene.parts.find((p) => p.id === other)?.label ??
    other;
  const linked = [
    ...scene.edges.flatMap((e) => (e.from === id ? [e.to] : e.to === id ? [e.from] : [])),
    ...scene.wires.flatMap((w) =>
      w.from.part === id ? [w.to.part] : w.to.part === id ? [w.from.part] : [],
    ),
  ];
  const unique = [...new Set(linked)].map(labelOf);
  const kind = part?.title && part.title !== name ? `${part.title}. ` : "";
  return {
    name,
    text: unique.length
      ? `${kind}Connected to ${unique.join(", ")}.`
      : kind || "Part of the drawing.",
  };
}
