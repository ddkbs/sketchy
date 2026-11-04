import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { FONT_CSS } from "./fonts.js";
import { PAPER } from "./palette.js";
import { fitText, renderScene } from "./render.js";
import { mountScene } from "./scene-view.js";
import { applyStep } from "./steps.js";
import "./styles.css";

// Screenshot page for `npm run screenshots`: renders one laid-out scene from
// build/preview/capture.json as a bare drawing, with its toolbar, or in drawing mode.
type Shot = {
  scene: LaidOutScene;
  mode: "plain" | "toolbar" | "draw";
  /** Plain drawings: the walkthrough step to show. */
  step?: number;
  /** Drawing mode: node ids to circle, a note next to the last one, and a question. */
  circle?: string[];
  note?: string;
  question?: string;
};

const name = new URLSearchParams(location.search).get("shot") ?? "";
const shot = ((await (await fetch("/capture.json")).json()) as Record<string, Shot>)[name]!;
const root = document.getElementById("app")!;
const ready = () => document.fonts.ready.then(() => document.body.setAttribute("data-ready", ""));

if (shot.mode === "plain") {
  document.body.style.cssText = `margin:0;background:${PAPER}`;
  const rendered = renderScene(shot.scene, FONT_CSS);
  const { svg } = rendered;
  root.appendChild(svg);
  if (shot.step !== undefined) applyStep(shot.scene, rendered, shot.step);
  void document.fonts.ready.then(() => fitText(svg));
  void ready();
} else {
  document.body.style.cssText = "margin:0;padding:28px;background:#1f1f1f;width:1000px";
  mountScene(root, shot.scene, {
    openLink: () => undefined,
    download: async () => undefined,
    ask: async () => true,
    toggleFullscreen: () => undefined,
  });
  const frame = root.querySelector<HTMLElement>(".frame")!;
  if (shot.mode === "toolbar") {
    frame.querySelector<HTMLElement>(".toolbar")!.style.opacity = "1";
  } else {
    await document.fonts.ready;
    frame.querySelector<HTMLButtonElement>('button[title="Draw on the sketch"]')!.click();
    drawMarks(frame, shot);
  }
  void ready();
}

/** Draws with real pointer events, so the marks go through the drawing mode itself. */
function drawMarks(frame: HTMLElement, shot: Shot): void {
  const svg = frame.querySelector<SVGSVGElement>("svg.sketch")!;
  const fire = (type: string, x: number, y: number) =>
    svg.dispatchEvent(
      new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, buttons: 1 }),
    );
  const box = (id: string) =>
    svg.querySelector(`.element[data-id="${id}"]`)!.getBoundingClientRect();
  for (const id of shot.circle ?? []) {
    const r = box(id);
    const [cx, cy, rx, ry] = [
      r.left + r.width / 2,
      r.top + r.height / 2,
      r.width / 2 + 16,
      r.height / 2 + 14,
    ];
    // A slightly open, hand-drawn loop.
    fire("pointerdown", cx + rx, cy);
    for (let a = 0; a <= Math.PI * 2.15; a += 0.12)
      fire(
        "pointermove",
        cx + rx * Math.cos(a) * (1 + 0.04 * Math.sin(a * 3)),
        cy + ry * Math.sin(a),
      );
    fire("pointerup", cx + rx, cy);
  }
  const last = shot.circle?.at(-1);
  if (shot.note && last) {
    frame.querySelector<HTMLButtonElement>('.drawbar button[data-tool="text"]')!.click();
    const r = box(last);
    fire("pointerdown", r.right - 10, r.top - 22);
    const input = frame.querySelector<HTMLInputElement>(".note-input")!;
    input.value = shot.note;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    frame.querySelector<HTMLButtonElement>('.drawbar button[data-tool="pen"]')!.click();
  }
  const ask = frame.querySelector<HTMLInputElement>(".drawbar-ask input");
  if (ask && shot.question) {
    ask.value = shot.question;
    ask.dispatchEvent(new Event("input"));
  }
}
