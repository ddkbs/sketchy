import type { LaidOutScene } from "../../../../src/scene/laid-out.js";
import data from "./scenes.json";

export type Scenario = {
  id: string;
  chip: string;
  prompt: string;
  intro: string;
  outro: string;
  scene: LaidOutScene;
  ms: number;
};

type Entry = { scene: unknown; ms: number };
const scenes = data as unknown as Record<"web" | "circuit" | "metaphor", Entry>;
const from = (key: keyof typeof scenes) => ({
  scene: scenes[key].scene as LaidOutScene,
  ms: scenes[key].ms,
});

export const SCENARIOS: Scenario[] = [
  {
    id: "web",
    chip: "Web request",
    prompt: "What happens when I open a web page?",
    intro: "Here is the whole path of one request. I'll walk you through it.",
    outro: "Only cache misses ever reach your servers.",
    ...from("web"),
  },
  {
    id: "circuit",
    chip: "ESP32 wiring",
    prompt: "How is my room_monitor.ino wired?",
    intro: "DHT22 on D4, motion sensor on D27, buzzer on D25, LED on D2:",
    outro: "Red is power, black is ground. The LED gets a 220 Ω resistor.",
    ...from("circuit"),
  },
  {
    id: "metaphor",
    chip: "CPU caches",
    prompt: "Explain CPU caches simply.",
    intro: "Think of the CPU as a cook. The closer the ingredient, the faster:",
    outro: "Registers are in your hands. The SSD is a trip to the supermarket.",
    ...from("metaphor"),
  },
];

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
