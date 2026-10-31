import type { ReactNode } from "react";
import { Reveal, Section, SectionHeader } from "./Frame";

const PIPELINE = [
  {
    n: "01",
    title: "You ask",
    body: "Any question where a picture helps: a system, a concept, your repo, an Arduino sketch, a photo of a board.",
    code: `"How is my room monitor wired?"`,
  },
  {
    n: "02",
    title: "Claude describes",
    body: "Claude picks a pattern and calls one tool with what to draw: nodes, parts, pins, labels and steps. Never a coordinate.",
    code: `sketch({ parts, wires: [
  { from: "esp.D27", to: "pir.OUT" }
] })`,
  },
  {
    n: "03",
    title: "Sketchy draws",
    body: "elkjs lays everything out, wires are routed pin to pin, callouts find free space, and rough.js renders it by hand.",
    code: `elkjs → routes → rough.js
✓ 6 parts · 11 wires · 41 ms`,
  },
];

export function HowItWorks() {
  return (
    <Section id="how" className="px-5 py-24 md:px-12">
      <SectionHeader
        index="01"
        eyebrow="How it works"
        title={
          <>
            Claude decides what.
            <br />
            Sketchy decides where.
          </>
        }
      >
        Language models are bad at coordinates and good at structure. So Claude only describes the
        structure, and a real layout engine does the geometry. Drawings come out precise and
        consistent, every time.
      </SectionHeader>
      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
        {PIPELINE.map((p, i) => (
          <Reveal key={p.n} delay={i * 0.08} className="flex flex-col gap-4 bg-background p-6">
            <div className="flex items-center justify-between font-mono text-[11px] text-faint">
              <span>{p.n}</span>
              {i < 2 && <span className="hidden md:inline">──→</span>}
            </div>
            <h3 className="text-[20px] font-semibold tracking-tight">{p.title}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
            <pre className="mt-auto overflow-x-auto rounded-lg border border-border bg-panel px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[#e9d58a]">
              {p.code}
            </pre>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const GALLERY: { src: string; title: string; body: string; span: string }[] = [
  {
    src: "request-step.png",
    title: "Systems, step by step",
    body: "Each step circles what matters in red pen and fades the rest.",
    span: "md:col-span-4",
  },
  {
    src: "esp32.png",
    title: "Circuits from your sketch",
    body: "50 real boards, sensors and modules, wired pin by pin.",
    span: "md:col-span-2 md:row-span-2",
  },
  {
    src: "transformer.png",
    title: "Concepts from CS and ML",
    body: "From transformers to TCP: structure, flow, comparison and metaphor patterns.",
    span: "md:col-span-4",
  },
  {
    src: "repo.png",
    title: "Your own code",
    body: "Modules, folders and data flow. Click a box to open the file.",
    span: "md:col-span-2",
  },
  {
    src: "photo.jpg",
    title: "Labeled photos",
    body: "Parts found by a vision model that runs on your machine.",
    span: "md:col-span-2",
  },
  {
    src: "comparison.png",
    title: "Comparisons",
    body: "Parallel columns, the key difference in accent.",
    span: "md:col-span-2",
  },
];

export function Gallery() {
  return (
    <Section id="gallery" className="px-5 py-24 md:px-12">
      <SectionHeader index="02" eyebrow="Gallery" title="One tool, many kinds of drawings.">
        Everything below was drawn by Sketchy from a single question in the chat. Hover a box for
        details, walk through steps with the arrow keys, export as SVG or PNG.
      </SectionHeader>
      <div className="mt-14 grid auto-rows-auto gap-4 md:grid-cols-6">
        {GALLERY.map((g, i) => (
          <Reveal key={g.src} delay={(i % 3) * 0.06} className={g.span}>
            <figure className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-panel transition-colors hover:border-white/25">
              <div className="flex flex-1 items-center justify-center overflow-hidden bg-paper p-3">
                <img
                  src={`/gallery/${g.src}`}
                  alt={g.title}
                  loading="lazy"
                  className="max-h-[560px] w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
              </div>
              <figcaption className="border-t border-border px-4 py-3">
                <div className="text-[15px] font-medium">{g.title}</div>
                <div className="text-[13.5px] text-muted-foreground">{g.body}</div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: "⇥",
    title: "Step-by-step walkthroughs",
    body: "Claude adds steps; you click or use the arrow keys. Each one circles what matters.",
  },
  {
    icon: "⌘",
    title: "Click to open the file",
    body: "Code diagrams link every box to its file in VS Code, Cursor, Windsurf or Zed.",
  },
  {
    icon: "↓",
    title: "Export SVG and PNG",
    body: "Every drawing downloads as a crisp file with the handwriting embedded.",
  },
  {
    icon: "⌁",
    title: "50 real parts",
    body: "Arduino Uno, Mega and Nano, ESP32, sensors, displays and motors from wokwi-elements, with named pins.",
  },
  {
    icon: "◎",
    title: "On-device vision",
    body: "Photo labeling runs Florence-2 locally. Your images never leave your machine.",
  },
  {
    icon: "◇",
    title: "Open and local",
    body: "MIT licensed, a standard MCP server. No account, no API key, no telemetry.",
  },
];

export function Features() {
  return (
    <Section className="px-5 py-24 md:px-12">
      <SectionHeader index="03" eyebrow="Details" title="Drawings you can actually use." />
      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.06} className="group bg-background p-6">
            <div className="mb-5 grid size-10 place-items-center rounded-lg border border-border-strong bg-panel font-mono text-[17px] text-marker transition-shadow group-hover:shadow-[0_0_24px_-4px_var(--marker)]">
              {f.icon}
            </div>
            <h3 className="text-[16.5px] font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{f.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
