import type { LaidOutScene } from "../../../src/scene/laid-out.js";
import data from "./scenes.json";

export type Scenario = {
  id: string;
  tab: string;
  prompt: string;
  attachment?: string;
  intro: string;
  outro: string;
  args: Record<string, unknown>;
  scene: LaidOutScene;
  ms: number;
};

type Entry = { args: Record<string, unknown>; scene: unknown; ms: number };
const scenes = data as unknown as Record<"web" | "circuit" | "metaphor", Entry>;
const from = (key: keyof typeof scenes) => ({
  args: scenes[key].args,
  scene: scenes[key].scene as LaidOutScene,
  ms: scenes[key].ms,
});

export const SCENARIOS: Scenario[] = [
  {
    id: "web",
    tab: "System flow",
    prompt: "What actually happens when I open a web page?",
    intro:
      "A lot happens in about 200 ms. Let me draw the whole path of one request, then walk you through it.",
    outro: "Only cache misses ever reach your servers. That is why popular sites stay fast.",
    ...from("web"),
  },
  {
    id: "circuit",
    tab: "Circuit",
    prompt: "How is my room monitor wired?",
    attachment: "room_monitor.ino",
    intro:
      "Your sketch reads a DHT22 on D4 and a PIR sensor on D27, beeps on D25 and blinks an LED on D2. Here is the wiring:",
    outro: "Red is power, black is ground, and the LED gets a 220 Ω resistor in series.",
    ...from("circuit"),
  },
  {
    id: "metaphor",
    tab: "Metaphor",
    prompt: "Explain CPU caches like I'm new to computers.",
    intro: "Think of the CPU as a cook. The closer an ingredient is, the faster the cooking:",
    outro: "Registers are what is already in your hands. The SSD is a trip to the supermarket.",
    ...from("metaphor"),
  },
];

/** Compact, readable JSON for the streamed tool call: short arrays of scalars stay on one line. */
export function prettyArgs(args: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const walk = (value: unknown, indent: string, key: string | null, last: boolean) => {
    const prefix = indent + (key === null ? "" : `"${key}": `);
    const comma = last ? "" : ",";
    if (Array.isArray(value)) {
      lines.push(`${prefix}[`);
      value.forEach((v, i) => walk(v, indent + "  ", null, i === value.length - 1));
      lines.push(`${indent}]${comma}`);
    } else if (value && typeof value === "object") {
      const inline = JSON.stringify(value).replace(/":/g, '": ').replace(/,"/g, ', "');
      if (inline.length + prefix.length <= 78) {
        lines.push(`${prefix}${inline}${comma}`);
        return;
      }
      const entries = Object.entries(value);
      lines.push(`${prefix}{`);
      entries.forEach(([k, v], i) => walk(v, indent + "  ", k, i === entries.length - 1));
      lines.push(`${indent}}${comma}`);
    } else {
      lines.push(`${prefix}${JSON.stringify(value)}${comma}`);
    }
  };
  walk(args, "", null, true);
  return lines;
}

export function summary(scene: LaidOutScene): string {
  const parts: string[] = [];
  const add = (n: number, word: string) => n && parts.push(`${n} ${word}${n === 1 ? "" : "s"}`);
  add(scene.nodes.length, "node");
  add(scene.parts.length, "part");
  add(scene.edges.length, "edge");
  add(scene.wires.length, "wire");
  add(scene.steps.length, "step");
  return parts.join(" · ");
}
