import type { LaidOutScene } from "../../src/scene/laid-out.js";
import { FONT_CSS } from "./fonts.js";
import { slug, toPngBase64, toSvgString } from "./export.js";
import { fitText, renderScene, type RenderedScene } from "./render.js";
import { applyStep } from "./steps.js";

/** What the view needs from its surroundings (the MCP host or a dev page). */
export interface Host {
  openLink(url: string): void;
  download(file: { name: string; mimeType: string; text?: string; base64?: string }): Promise<void>;
  toggleFullscreen?(): void;
}

export function mountScene(root: HTMLElement, scene: LaidOutScene, host: Host): void {
  root.replaceChildren();
  const frame = div("frame");
  const canvas = div("canvas");
  const tooltip = div("tooltip");
  tooltip.hidden = true;
  const rendered = renderScene(scene, FONT_CSS);
  canvas.appendChild(rendered.svg);
  frame.append(toolbar(scene, rendered, host), canvas);
  if (scene.steps.length) frame.appendChild(stepper(scene, rendered));
  frame.appendChild(tooltip);
  root.appendChild(frame);

  void document.fonts.ready.then(() => fitText(rendered.svg));
  wireInteractions(scene, rendered, host, tooltip, frame);
}

function toolbar(scene: LaidOutScene, rendered: RenderedScene, host: Host): HTMLElement {
  const bar = div("toolbar");
  const name = slug(scene.title?.lines.join(" "));
  bar.append(
    button("SVG", "Download as SVG", async () => {
      await host.download({
        name: `${name}.svg`,
        mimeType: "image/svg+xml",
        text: toSvgString(rendered.svg),
      });
    }),
    button("PNG", "Download as PNG", async () => {
      await host.download({
        name: `${name}.png`,
        mimeType: "image/png",
        base64: await toPngBase64(rendered.svg),
      });
    }),
  );
  if (host.toggleFullscreen) {
    bar.append(button("⤢", "Toggle fullscreen", () => host.toggleFullscreen!()));
  }
  return bar;
}

function stepper(scene: LaidOutScene, rendered: RenderedScene): HTMLElement {
  const panel = div("stepper");
  const prev = button("‹", "Previous step", () => go(-1));
  const next = button("›", "Next step", () => go(1));
  const body = div("step-body");
  const dots = div("step-dots");
  panel.append(prev, body, next);
  panel.appendChild(dots);
  let index: number | undefined;

  const show = () => {
    applyStep(scene, rendered, index);
    prev.disabled = index === undefined;
    next.disabled = index === scene.steps.length - 1;
    body.replaceChildren();
    if (index === undefined) {
      const start = document.createElement("button");
      start.className = "start";
      start.textContent = `Walk through ${scene.steps.length} steps  ›`;
      start.onclick = () => go(1);
      body.appendChild(start);
    } else {
      const step = scene.steps[index]!;
      const head = document.createElement("div");
      head.className = "step-title";
      head.innerHTML = `<span class="step-count">${index + 1}/${scene.steps.length}</span>`;
      head.append(step.title);
      body.appendChild(head);
      if (step.text) {
        const p = document.createElement("p");
        p.textContent = step.text;
        body.appendChild(p);
      }
    }
    dots.replaceChildren(
      ...scene.steps.map((_, i) => {
        const dot = document.createElement("button");
        dot.className = `dot${i === index ? " on" : ""}`;
        dot.title = scene.steps[i]!.title;
        dot.onclick = () => {
          index = i;
          show();
        };
        return dot;
      }),
    );
  };
  const go = (delta: number) => {
    const target = (index ?? -1) + delta;
    index = target < 0 ? undefined : Math.min(target, scene.steps.length - 1);
    show();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "Escape") {
      index = undefined;
      show();
    }
  });
  show();
  return panel;
}

function wireInteractions(
  scene: LaidOutScene,
  rendered: RenderedScene,
  host: Host,
  tooltip: HTMLElement,
  frame: HTMLElement,
): void {
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  const groups = new Map(scene.groups.map((g) => [g.id, g]));
  const wires = new Map(scene.wires.map((w) => [w.id, w]));
  const svg = rendered.svg;

  const show = (html: string, event: MouseEvent) => {
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const box = frame.getBoundingClientRect();
    const x = Math.min(event.clientX - box.left + 14, box.width - tooltip.offsetWidth - 8);
    tooltip.style.left = `${Math.max(8, x)}px`;
    tooltip.style.top = `${event.clientY - box.top + 16}px`;
  };
  const hide = () => (tooltip.hidden = true);

  svg.addEventListener("mousemove", (event) => {
    const target = event.target as Element;
    const pin = target.closest(".pin");
    if (pin) {
      const signals = pin.getAttribute("data-signals");
      return show(
        `<b>${esc(pin.getAttribute("data-pin") ?? "")}</b>${signals ? `<br>${esc(signals)}` : ""}`,
        event,
      );
    }
    const g = target.closest<SVGGElement>(".element");
    const id = g?.getAttribute("data-id") ?? "";
    const node = nodes.get(id);
    if (node && (node.description || node.file)) {
      return show(
        `<b>${esc(node.label)}</b>` +
          (node.description ? `<br>${esc(node.description)}` : "") +
          (node.file
            ? `<div class="file">${esc(shortPath(node.file))}${node.line ? `:${node.line}` : ""}<br><i>click to open</i></div>`
            : ""),
        event,
      );
    }
    const group = groups.get(id);
    if (group?.description)
      return show(`<b>${esc(group.label)}</b><br>${esc(group.description)}`, event);
    const wire = wires.get(id);
    if (wire) {
      return show(
        `${esc(wire.from.part)}.${esc(wire.from.pin)} → ${esc(wire.to.part)}.${esc(wire.to.pin)}${wire.label ? `<br>${esc(wire.label)}` : ""}`,
        event,
      );
    }
    hide();
  });
  svg.addEventListener("mouseleave", hide);
  svg.addEventListener("click", (event) => {
    const target = event.target as Element;
    const credit = target.closest(".attribution");
    if (credit) return host.openLink(credit.getAttribute("data-href") ?? "");
    const id = target.closest(".element")?.getAttribute("data-id");
    const link = id ? nodes.get(id)?.link : undefined;
    if (link) host.openLink(link);
  });
}

function shortPath(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts.length > 3 ? `…/${parts.slice(-3).join("/")}` : path;
}

function div(className: string): HTMLDivElement {
  const d = document.createElement("div");
  d.className = className;
  return d;
}

function button(label: string, title: string, onClick: () => unknown): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.title = title;
  b.setAttribute("aria-label", title);
  b.onclick = () => void onClick();
  return b;
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
