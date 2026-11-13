// Re-takes the README and website screenshots from the real viewer with headless
// Chrome: `npm run screenshots`. Scenes come from the website demo, the test
// fixtures and scripts/screenshot-scenes.ts. Names after `--` retake only those
// shots; animated shots need ffmpeg.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";
import { parseCompact } from "../src/scene/compact.js";
import { SAMPLES } from "../test/fixtures.js";
import {
  CAFFEINE,
  DROPLET,
  NIGHT_TRAIN,
  PYTHAGORAS,
  REPO,
  REQUEST,
  TRANSFORMER,
  WATER_CYCLE,
  WEB_TIMELINE,
} from "./screenshot-scenes.js";

const root = new URL("..", import.meta.url);
const at = (path: string) => new URL(path, root).pathname;
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 5191;
const DARK = "#1f1f1f";

type SceneInput = Record<string, any>;
type Fill = (b: SceneBuilder) => void;
const demo = JSON.parse(readFileSync(at("website/scripts/scenes.input.json"), "utf8")) as Record<
  string,
  SceneInput
>;
const fromDemo =
  (name: string): Fill =>
  (b) =>
    fill(b, demo[name]!);
const fromCompact =
  (source: string): Fill =>
  (b) =>
    fill(b, parseCompact(source));

type Shot = {
  scene: Fill;
  mode: "plain" | "toolbar" | "draw" | "chat";
  prompt?: string;
  before?: string;
  after?: string;
  /** Plain drawings: the walkthrough step to show, counted from 0. */
  step?: number;
  circle?: string[];
  note?: string;
  question?: string;
  /** Plain drawings: turn this hidden slider from 0 to 1 and save a looping GIF. */
  animate?: { slider: string; frames: number; fps: number; width: number };
  files: string[];
};

/** Each screenshot: a scene, how it is shown, and where the image goes. */
const SHOTS: Record<string, Shot> = {
  chat: {
    scene: fromDemo("web"),
    mode: "chat",
    prompt: "What happens when I open a web page? Walk me through it.",
    before: "Here is the whole path, from your browser to the database:",
    after:
      "Step through it with the arrows: the CDN answers most static files on its own, and only cache misses reach your servers. Slow jobs wait in a queue, so the page never does.",
    files: ["docs/images/chat.png", "website/public/gallery/chat.png"],
  },
  draw: {
    scene: fromDemo("web"),
    mode: "draw",
    circle: ["cdn"],
    note: "why not the server?",
    question: "Why does the CDN answer most requests?",
    files: ["docs/images/draw.png", "website/public/gallery/draw.png"],
  },
  request: { scene: fromCompact(REQUEST), mode: "plain", files: ["docs/images/request.png"] },
  "request-step": {
    scene: fromCompact(REQUEST),
    mode: "plain",
    step: 4,
    files: ["docs/images/request-step.png", "website/public/gallery/request-step.png"],
  },
  transformer: {
    scene: fromCompact(TRANSFORMER),
    mode: "plain",
    files: ["docs/images/transformer.png"],
  },
  repo: {
    scene: fromCompact(REPO),
    mode: "plain",
    files: ["docs/images/repo.png", "website/public/gallery/repo.png"],
  },
  esp32: {
    scene: fromDemo("circuit"),
    mode: "plain",
    files: ["docs/images/esp32.png", "website/public/gallery/esp32.png"],
  },
  circuit: { scene: SAMPLES.circuit!, mode: "plain", files: ["docs/images/circuit.png"] },
  comparison: { scene: SAMPLES.comparison!, mode: "plain", files: ["docs/images/comparison.png"] },
  metaphor: { scene: fromDemo("metaphor"), mode: "plain", files: ["docs/images/metaphor.png"] },
  droplet: {
    scene: fromCompact(DROPLET),
    mode: "plain",
    animate: { slider: "k", frames: 72, fps: 18, width: 800 },
    files: ["docs/images/droplet.gif"],
  },
  geometry: { scene: fromCompact(PYTHAGORAS), mode: "plain", files: ["docs/images/geometry.png"] },
  molecule: { scene: fromCompact(CAFFEINE), mode: "plain", files: ["docs/images/molecule.png"] },
  map: { scene: fromCompact(NIGHT_TRAIN), mode: "plain", files: ["docs/images/map.png"] },
  cycle: { scene: fromCompact(WATER_CYCLE), mode: "plain", files: ["docs/images/cycle.png"] },
  timeline: {
    scene: fromCompact(WEB_TIMELINE),
    mode: "plain",
    files: ["docs/images/timeline.png"],
  },
};

const only = process.argv.slice(2);
const shots = Object.entries(SHOTS).filter(([name]) => !only.length || only.includes(name));

function fill(b: SceneBuilder, s: SceneInput): void {
  b.reset({ title: s.title, subtitle: s.subtitle, direction: s.direction });
  for (const g of s.groups ?? []) b.addGroup(g);
  for (const n of s.nodes ?? []) b.addNode(n);
  for (const p of s.parts ?? []) b.addPart(p);
  for (const f of s.figures ?? []) b.addFigure(f);
  for (const e of s.edges ?? []) b.addEdge(e);
  for (const w of s.wires ?? []) b.connect(w);
  for (const l of s.labels ?? []) b.addLabel(l);
  for (const st of s.steps ?? []) b.addStep(st);
}

const parts = await PartIndex.load();
const capture: Record<string, unknown> = {};
for (const [name, { scene, files: _files, ...shot }] of shots) {
  const builder = new SceneBuilder(parts);
  scene(builder);
  capture[name] = { ...shot, scene: await layoutScene(builder.scene, parts) };
}
mkdirSync(at("build/preview"), { recursive: true });
writeFileSync(at("build/preview/capture.json"), JSON.stringify(capture));

const vite = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
  cwd: root.pathname,
  stdio: "ignore",
});
try {
  await waitFor(`http://localhost:${PORT}/capture.html`);
  const out = at("build/screenshots");
  mkdirSync(out, { recursive: true });
  for (const [name, shot] of shots) {
    const scene = (capture[name] as { scene: { width: number; height: number } }).scene;
    const plain = shot.mode === "plain";
    if (shot.animate) {
      const gif = await animate(name, shot.animate, scene, out);
      for (const file of shot.files) writeFileSync(at(file), gif);
      console.error(`screenshots: ${name} → ${shot.files.join(", ")}`);
      continue;
    }
    const raw = `${out}/${name}.raw.png`;
    execFileSync(
      CHROME,
      [
        "--headless=new",
        "--hide-scrollbars",
        "--force-device-scale-factor=2",
        "--virtual-time-budget=8000",
        `--window-size=${plain ? `${Math.ceil(scene.width)},${Math.ceil(scene.height)}` : shot.mode === "chat" ? "1296,1600" : "1056,1400"}`,
        `--screenshot=${raw}`,
        `http://localhost:${PORT}/capture.html?shot=${name}`,
      ],
      { stdio: "ignore" },
    );
    // Framed shots sit on a dark page; trim it and keep an even margin.
    const image = plain
      ? sharp(raw)
      : sharp(await sharp(raw).trim({ background: DARK, threshold: 4 }).toBuffer()).extend({
          top: 40,
          bottom: 40,
          left: 40,
          right: 40,
          background: DARK,
        });
    const png = await image.png({ compressionLevel: 9 }).toBuffer();
    for (const file of shot.files) {
      writeFileSync(at(file), png);
    }
    console.error(`screenshots: ${name} → ${shot.files.join(", ")}`);
  }
} finally {
  vite.kill();
}

/** Renders every frame of a slider animation and turns them into a looping GIF. */
async function animate(
  name: string,
  { slider, frames, fps, width }: NonNullable<Shot["animate"]>,
  scene: { width: number; height: number },
  out: string,
): Promise<Buffer> {
  const dir = `${out}/${name}-frames`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const shoot = (i: number) =>
    new Promise<void>((resolve, reject) => {
      const state = encodeURIComponent(JSON.stringify({ [slider]: String(i / frames) }));
      const chrome = spawn(
        CHROME,
        [
          "--headless=new",
          "--hide-scrollbars",
          "--force-device-scale-factor=2",
          "--virtual-time-budget=5000",
          `--user-data-dir=${dir}/profile-${i % 8}`,
          `--window-size=${Math.ceil(scene.width)},${Math.ceil(scene.height)}`,
          `--screenshot=${dir}/${String(i).padStart(3, "0")}.png`,
          `http://localhost:${PORT}/capture.html?shot=${name}&state=${state}`,
        ],
        { stdio: "ignore" },
      );
      chrome.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Chrome: ${code}`))));
    });
  // Eight browsers at a time.
  for (let i = 0; i < frames; i += 8)
    await Promise.all(Array.from({ length: Math.min(8, frames - i) }, (_, j) => shoot(i + j)));
  const gif = `${dir}/${name}.gif`;
  execFileSync(
    "ffmpeg",
    [
      ...["-y", "-loglevel", "error", "-framerate", String(fps), "-i", `${dir}/%03d.png`],
      "-vf",
      `scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];` +
        "[b][p]paletteuse=dither=none:diff_mode=rectangle",
      ...["-loop", "0", gif],
    ],
    { stdio: "inherit" },
  );
  return readFileSync(gif);
}

async function waitFor(url: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (
      await fetch(url)
        .then((r) => r.ok)
        .catch(() => false)
    )
      return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Vite did not start on ${url}`);
}
