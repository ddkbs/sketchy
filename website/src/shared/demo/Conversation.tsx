import "@fontsource/kalam/700.css";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "../Logo";
import { SketchFrame } from "./SketchFrame";

const ease = [0.22, 1, 0.36, 1] as const;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "asked" | "answered" | "calling" | "done";

type Example = { id: string; label: string; text: string; icon: string };

/** What else Sketchy draws: each chip is one more real tool call in the same chat. */
const EXAMPLES: Example[] = [
  {
    id: "systems",
    label: "Systems",
    text: "Flows with a step-by-step walkthrough.",
    icon: "M4 6h5v5H4zM15 13h5v5h-5zM9 8.5h3a2 2 0 0 1 2 2v2.5a2 2 0 0 0 2 2",
  },
  {
    id: "pictures",
    label: "Pictures that move",
    text: "Free drawings with sliders and steps.",
    icon: "M4 17c3-8 6-8 8-4s5 4 8-4M17 5h3v3",
  },
  {
    id: "molecule",
    label: "Molecules",
    text: "Drawn from a SMILES string.",
    icon: "M12 3.5 19.4 7.75v8.5L12 20.5l-7.4-4.25v-8.5ZM12 8.5l3 1.75v3.5l-3 1.75-3-1.75v-3.5Z",
  },
  {
    id: "map",
    label: "Maps",
    text: "Countries, places and routes by name.",
    icon: "M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6ZM9 4v14M15 6v14",
  },
  {
    id: "code",
    label: "Your code",
    text: "Modules and data flow, straight from your repo. In your editor, a click opens the file.",
    icon: "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14",
  },
  {
    id: "circuit",
    label: "Circuits",
    text: "50 real parts, wired pin by pin.",
    icon: "M7 4v4M12 4v4M17 4v4M7 16v4M12 16v4M17 16v4M5 8h14v8H5z",
  },
];

/**
 * The landing page's demo: a few turns of one chat, without any window around them. Every
 * drawing is the real Sketchy viewer, fed by this page the way the chat app feeds it.
 */
export function Conversation() {
  const [example, setExample] = useState(EXAMPLES[0]!);
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-28 sm:gap-36">
      <Turn
        prompt="Why can a plane fly?"
        answer="It's all about the shape of the wing. Let me sketch it:"
        tool="sketch"
        scene="wing"
        eager
        note="right in the chat!"
        outro="Air over the curved top moves faster and pushes down less than the air below, so the wing gets lifted. Click through the steps to watch it happen."
      />
      <Turn
        prompt="Show me an Arduino Uno and label the pins."
        answer="Here's a real photo. I found the parts with the vision model on your computer:"
        tool="find_image · locate · sketch"
        scene="photo"
        note="labeled on your computer"
        outro="The photo is CC0 from Wikimedia Commons, and the credit stays on it. Your own photos never leave your machine."
      />
      <Turn
        prompt="What else can you draw?"
        answer={
          <>
            Anything worth explaining. Pick one:
            <span className="mt-4 flex flex-wrap gap-1.5">
              {EXAMPLES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setExample(e)}
                  aria-pressed={e.id === example.id}
                  className={`cursor-target group inline-flex h-9 items-center gap-1.5 rounded-xl border pl-2.5 pr-3 text-[13.5px] font-medium transition-all duration-300 ${
                    e.id === example.id
                      ? "border-accent/50 bg-accent/[0.14] text-foreground shadow-[0_0_0_1px_rgba(239,84,68,0.15),0_8px_28px_-10px_var(--accent)]"
                      : "border-white/10 bg-white/[0.045] text-foreground/75 hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.08] hover:text-foreground"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`size-4 shrink-0 transition-colors duration-300 ${
                      e.id === example.id
                        ? "text-accent"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d={e.icon} />
                  </svg>
                  {e.label}
                </button>
              ))}
            </span>
          </>
        }
        tool="sketch"
        scene={example.id}
        note="try one!"
        outro={
          <AnimatePresence mode="wait">
            <motion.span
              key={example.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              <span className="text-foreground">{example.label}.</span>{" "}
              <span className="text-muted-foreground">{example.text}</span>
            </motion.span>
          </AnimatePresence>
        }
      />
    </div>
  );
}

/**
 * One scripted turn: the question, typing, the answer, the tool call and the real drawing.
 * It plays once when it scrolls into view; the viewer loads well before that.
 */
function Turn({
  prompt,
  answer,
  tool,
  scene,
  note,
  outro,
  eager = false,
}: {
  prompt: string;
  answer: ReactNode;
  tool: string;
  scene: string;
  note: string;
  outro: ReactNode;
  eager?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const near = useInView(root, { once: true, margin: "1200px 0px" });
  const seen = useInView(root, { once: true, amount: 0.3 });
  const [idle, setIdle] = useState(false);
  const [phase, setPhase] = useState<Phase>("asked");
  const [run, setRun] = useState(false);
  const [drawn, setDrawn] = useState(false);

  // The first turn loads as soon as the page is idle, so it is ready when the reader arrives.
  useEffect(() => {
    if (!eager) return;
    // Safari has no requestIdleCallback.
    if (!("requestIdleCallback" in window)) {
      const id = setTimeout(() => setIdle(true), 300);
      return () => clearTimeout(id);
    }
    const id = requestIdleCallback(() => setIdle(true), { timeout: 800 });
    return () => cancelIdleCallback(id);
  }, [eager]);

  useEffect(() => {
    if (!seen) return;
    let alive = true;
    void (async () => {
      await wait(450);
      if (!alive) return;
      setPhase("answered");
      await wait(350);
      if (alive) setRun(true);
    })();
    return () => {
      alive = false;
    };
  }, [seen]);

  const answered = phase !== "asked";
  const calling = phase === "calling";
  const shown = drawn;

  return (
    <div ref={root} className="relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease }}
        className="flex justify-end"
      >
        <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-white/[0.09] px-4 py-2.5 text-[15px] sm:text-[16px]">
          {prompt}
        </p>
      </motion.div>

      <div className="mt-6 flex items-start gap-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border-strong bg-white/[0.04]">
          <span className="size-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="min-h-[26px] text-[15px] leading-relaxed text-foreground/90 sm:text-[16px]">
            <AnimatePresence mode="wait">
              {answered ? (
                <motion.div
                  key="text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {answer}
                </motion.div>
              ) : (
                <motion.span key="dots" exit={{ opacity: 0 }} className="inline-flex gap-1 pt-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 animate-pulse rounded-full bg-white/40"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            initial={false}
            animate={{ opacity: run ? 1 : 0, y: run ? 0 : 6 }}
            transition={{ duration: 0.35, ease }}
            className="mt-4 flex w-fit items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.045] py-1.5 pl-1.5 pr-3.5 text-[13.5px]"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-white/[0.07] text-foreground">
              <LogoMark className="size-4" />
            </span>
            <span className="font-medium text-foreground">Sketchy</span>
            <span className="font-mono text-[12px] text-muted-foreground">{tool}</span>
            <span className="ml-1 grid size-[18px] place-items-center">
              {calling || !drawn ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
              ) : (
                <svg viewBox="0 0 16 16" className="size-[18px]" aria-label="done">
                  <circle cx="8" cy="8" r="8" fill="var(--accent)" fillOpacity=".18" />
                  <path
                    d="m4.8 8.2 2.1 2.1 4.3-4.6"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </motion.div>

          <motion.div
            initial={false}
            animate={{ opacity: run ? 1 : 0, y: run ? 0 : 14 }}
            transition={{ duration: 0.6, ease }}
            className="relative mt-3"
          >
            <SketchFrame
              load={near || idle}
              run={run}
              scene={scene}
              onCall={(state) => {
                setPhase(state === "calling" ? "calling" : "done");
                if (state === "done") setDrawn(true);
              }}
            />
            <Note text={note} />
          </motion.div>

          <motion.div
            initial={false}
            animate={{ opacity: shown ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-4 text-[15px] leading-relaxed text-foreground/90 sm:text-[16px]"
          >
            {outro}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** A hand-written remark beside the drawing, with an arrow pointing at it. */
function Note({ text }: { text: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -left-[170px] top-[30%] hidden w-[150px] -rotate-6 text-right text-accent lg:block"
      style={{ fontFamily: "Kalam, cursive" }}
    >
      <div className="text-[19px] font-bold leading-tight">{text}</div>
      <svg viewBox="0 0 120 50" className="ml-auto mt-1 h-10 w-24" fill="none">
        <path
          d="M6 10 C 40 6, 80 14, 112 38"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M98 36 L 113 39 L 108 25"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** A plain chat turn without a drawing: the question and an answer made of any content. */
export function Exchange({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease }}
        className="flex justify-end"
      >
        <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-white/[0.09] px-4 py-2.5 text-[15px] sm:text-[16px]">
          {prompt}
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, delay: 0.25, ease }}
        className="mt-6 flex items-start gap-3"
      >
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border-strong bg-white/[0.04]">
          <span className="size-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
        </span>
        <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-foreground/90 sm:text-[16px]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
