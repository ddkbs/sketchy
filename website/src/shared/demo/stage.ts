import type { LaidOutScene } from "../../../../src/scene/laid-out.js";
import { FONT_CSS } from "../../../../viewer/src/fonts.js";
import { fitText, renderScene, type RenderedScene } from "../../../../viewer/src/render.js";
import { applyStep } from "../../../../viewer/src/steps.js";

/** Draw order for the build animation: frames first, then boxes, then what connects them. */
const ORDER = ["group", "node", "part", "image", "edge", "wire", "label"];

/**
 * The real Sketchy renderer, driven step by step: everything starts hidden and is then drawn in
 * the order a person would sketch it.
 */
export class Stage {
  private rendered: RenderedScene;

  constructor(
    private readonly root: HTMLElement,
    readonly scene: LaidOutScene,
  ) {
    this.rendered = renderScene(scene, FONT_CSS);
    root.replaceChildren(this.rendered.svg);
    void document.fonts.ready.then(() => fitText(this.rendered.svg));
    this.hide();
  }

  get count(): number {
    return this.rendered.elements.size;
  }

  hide(): void {
    applyStep(this.scene, this.rendered, undefined);
    const title = this.rendered.svg.querySelector<SVGGElement>(".title");
    if (title) title.style.opacity = "0";
    this.rendered.elements.forEach((g) => (g.style.opacity = "0"));
  }

  /** Reveals the scene element by element; resolves when done or when `alive()` turns false. */
  async build(alive: () => boolean, pace = 140): Promise<void> {
    const title = this.rendered.svg.querySelector<SVGGElement>(".title");
    if (title) title.style.opacity = "1";
    await wait(260);
    const sorted = [...this.rendered.elements].sort(
      ([, a], [, b]) => ORDER.indexOf(a.dataset.kind!) - ORDER.indexOf(b.dataset.kind!),
    );
    for (const [, g] of sorted) {
      if (!alive()) return;
      drawIn(g);
      await wait(g.dataset.kind === "group" ? pace * 1.6 : pace);
    }
    await wait(500);
  }

  step(index: number | undefined): void {
    applyStep(this.scene, this.rendered, index);
  }

  /** Calls back with the id of a box, part or photo the reader clicks. */
  onPick(pick: (id: string) => void): void {
    for (const [id, g] of this.rendered.elements) {
      if (!["node", "part", "image"].includes(g.dataset.kind ?? "")) continue;
      g.style.cursor = "pointer";
      g.addEventListener("click", (event) => {
        event.stopPropagation();
        pick(id);
      });
    }
  }

  /** Circles one element with its connections, as a step would; undefined shows everything. */
  focus(id: string | undefined): void {
    if (id === undefined) return this.step(undefined);
    const touching = [
      ...this.scene.edges.filter((e) => e.from === id || e.to === id).map((e) => e.id),
      ...this.scene.wires.filter((w) => w.from.part === id || w.to.part === id).map((w) => w.id),
    ];
    const scene = { ...this.scene, steps: [{ title: "", highlight: [id, ...touching] }] };
    applyStep(scene, this.rendered, 0);
  }

  showAll(): void {
    const title = this.rendered.svg.querySelector<SVGGElement>(".title");
    if (title) title.style.opacity = "1";
    this.rendered.elements.forEach((g) => (g.style.opacity = ""));
  }
}

/** Pen strokes trace themselves, fills and text fade in underneath. */
function drawIn(g: SVGGElement): void {
  g.style.opacity = "";
  if (g.dataset.kind === "part" || g.dataset.kind === "image") {
    g.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(.22,1,.36,1)",
      },
    );
    return;
  }
  for (const path of g.querySelectorAll<SVGPathElement>("path")) {
    const stroke = path.getAttribute("stroke");
    if (!stroke || stroke === "none") {
      path.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 500,
        delay: 180,
        fill: "backwards",
      });
      continue;
    }
    const length = path.getTotalLength();
    path.animate(
      [
        { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
        { strokeDasharray: `${length}`, strokeDashoffset: "0" },
      ],
      { duration: Math.min(700, 220 + length * 0.6), easing: "ease-out" },
    );
  }
  for (const node of g.querySelectorAll("text, image, foreignObject, circle")) {
    node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 380,
      delay: 200,
      fill: "backwards",
    });
  }
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
