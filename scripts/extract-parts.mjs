// Renders every wokwi-elements component once in a headless DOM and records
// its static SVG markup, size and pin positions. The result is the raw data
// behind the part index; the server never needs a DOM at runtime.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const bundlePath = require.resolve("@wokwi/elements/dist/wokwi-elements.bundle.js");
const { version } = JSON.parse(
  readFileSync(new URL("../node_modules/@wokwi/elements/package.json", import.meta.url), "utf8"),
);

GlobalRegistrator.register();
vm.runInThisContext(readFileSync(bundlePath, "utf8"));

const bundle = readFileSync(bundlePath, "utf8");
const tags = [...new Set(bundle.match(/wokwi-[a-z0-9-]+(?=['"])/g))].filter((tag) =>
  customElements.get(tag),
);

// Variants are rendered for attributes that change how a part looks.
const VARIANTS = {
  "wokwi-led": [["color", ["red", "green", "blue", "yellow", "white", "orange"]]],
  "wokwi-resistor": [["value", ["220", "330", "1000", "4700", "10000", "100000"]]],
  "wokwi-pushbutton": [["color", ["red", "green", "blue", "yellow", "black"]]],
};

const PX_PER_UNIT = { mm: 96 / 25.4, cm: 96 / 2.54, in: 96, px: 1, "": 1 };

function toPx(length) {
  const match = /^([\d.]+)\s*([a-z]*)$/.exec(String(length ?? "").trim());
  if (!match) return undefined;
  const factor = PX_PER_UNIT[match[2]];
  return factor === undefined ? undefined : Number(match[1]) * factor;
}

async function render(tag, attributes) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  document.body.appendChild(el);
  await el.updateComplete;
  // Some parts carry small decorative SVGs (e.g. a hidden music note); the
  // part itself is the largest top-level one.
  const svg = [...(el.shadowRoot?.querySelectorAll("svg") ?? [])]
    .filter((candidate) => !candidate.parentElement?.closest("svg"))
    .map((candidate) => ({
      candidate,
      area:
        (toPx(candidate.getAttribute("width")) ?? 0) *
        (toPx(candidate.getAttribute("height")) ?? 0),
    }))
    .sort((a, b) => b.area - a.area)[0]?.candidate;
  if (!svg) {
    el.remove();
    return undefined;
  }
  const width = toPx(svg.getAttribute("width"));
  const height = toPx(svg.getAttribute("height"));
  if (!width || !height) {
    el.remove();
    return undefined;
  }
  // Fix the outer size in px so the markup can be dropped into any <svg>.
  svg.setAttribute("width", String(round(width)));
  svg.setAttribute("height", String(round(height)));
  inlineStyles(svg, el.constructor.styles);
  const pins = (el.pinInfo ?? []).map((pin) => ({
    name: pin.name,
    x: round(pin.x),
    y: round(pin.y),
    signals: (pin.signals ?? []).map(describeSignal).filter(Boolean),
  }));
  // Parts are parsed as XML later, where HTML entities like &nbsp; are invalid.
  const markup = svg.outerHTML
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&nbsp;/g, "&#160;")
    .replace(/\s{2,}/g, " ");
  el.remove();
  return { width: round(width), height: round(height), svg: markup, pins };
}

/**
 * Lit styles live in the shadow root and are lost once the SVG is extracted
 * (e.g. the Uno's 2px label text). Inline the simple rules that target SVG
 * content; host, layout and interaction rules do not apply to a static image.
 */
function inlineStyles(svg, styles) {
  const css = [styles]
    .flat(Infinity)
    .filter(Boolean)
    .map((s) => s.cssText ?? "")
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const usable = selectors
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !/:host|:hover|:focus|::|^@/.test(s));
    if (usable.length === 0) continue;
    const declarations = body.trim().replace(/;?\s*$/, ";");
    for (const selector of usable) {
      let matches;
      try {
        matches = svg.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const node of matches) {
        node.setAttribute("style", `${declarations}${node.getAttribute("style") ?? ""}`);
      }
    }
  }
}

function describeSignal(signal) {
  if (!signal || typeof signal !== "object") return undefined;
  if (signal.type === "power")
    return signal.signal === "GND"
      ? "GND"
      : `power ${signal.signal ?? ""}${signal.voltage ? ` ${signal.voltage}V` : ""}`.trim();
  if (signal.type === "analog") return `analog A${signal.channel}`;
  if (signal.type === "pwm") return "PWM";
  if (signal.type) return [signal.type, signal.signal].filter(Boolean).join(" ");
  return undefined;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

const parts = [];
for (const tag of tags) {
  const type = tag.replace(/^wokwi-/, "");
  const base = await render(tag, {});
  if (!base) continue;
  const variants = {};
  for (const [attribute, values] of VARIANTS[tag] ?? []) {
    for (const value of values) {
      const rendered = await render(tag, { [attribute]: value });
      if (rendered) variants[`${attribute}=${value}`] = rendered.svg;
    }
  }
  parts.push({ type, tag, ...base, variants });
}

mkdirSync(new URL("../build/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../build/parts.json", import.meta.url),
  JSON.stringify({ source: "@wokwi/elements", version, license: "MIT", parts }),
);
console.error(`extract-parts: wrote ${parts.length} parts`);
await GlobalRegistrator.unregister();
