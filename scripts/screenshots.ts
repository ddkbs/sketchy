// Re-takes the README and website screenshots from the real viewer with headless
// Chrome: `npm run screenshots`. Scenes come from the website demo input.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { layoutScene } from "../src/layout/index.js";
import { PartIndex } from "../src/parts/index.js";
import { SceneBuilder } from "../src/scene/builder.js";

const root = new URL("..", import.meta.url);
const at = (path: string) => new URL(path, root).pathname;
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 5191;
const DARK = "#1f1f1f";

type SceneInput = Record<string, any>;
const scenes = JSON.parse(readFileSync(at("website/scripts/scenes.input.json"), "utf8")) as Record<
  string,
  SceneInput
>;

/** Each screenshot: a scene, how it is shown, and where the image goes. */
const SHOTS = {
  chat: {
    scene: "web",
    mode: "toolbar",
    files: ["docs/images/chat.png", "website/public/gallery/chat.png"],
  },
  draw: {
    scene: "web",
    mode: "draw",
    circle: ["cdn"],
    note: "why not the server?",
    question: "Why does the CDN answer most requests?",
    files: ["docs/images/draw.png", "website/public/gallery/draw.png"],
  },
  esp32: {
    scene: "circuit",
    mode: "plain",
    files: ["docs/images/esp32.png", "website/public/gallery/esp32.png"],
  },
  metaphor: { scene: "metaphor", mode: "plain", files: ["docs/images/metaphor.png"] },
} as const;

function fill(b: SceneBuilder, s: SceneInput): void {
  b.reset({ title: s.title, subtitle: s.subtitle, direction: s.direction });
  for (const g of s.groups ?? []) b.addGroup(g);
  for (const n of s.nodes ?? []) b.addNode(n);
  for (const p of s.parts ?? []) b.addPart(p);
  for (const e of s.edges ?? []) b.addEdge(e);
  for (const w of s.wires ?? []) b.connect(w);
  for (const l of s.labels ?? []) b.addLabel(l);
  for (const st of s.steps ?? []) b.addStep(st);
}

const parts = await PartIndex.load();
const capture: Record<string, unknown> = {};
for (const [name, shot] of Object.entries(SHOTS)) {
  const builder = new SceneBuilder(parts);
  fill(builder, scenes[shot.scene]!);
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
  for (const [name, shot] of Object.entries(SHOTS)) {
    const scene = (capture[name] as { scene: { width: number; height: number } }).scene;
    const plain = shot.mode === "plain";
    const raw = `${out}/${name}.raw.png`;
    execFileSync(
      CHROME,
      [
        "--headless=new",
        "--hide-scrollbars",
        "--force-device-scale-factor=2",
        "--virtual-time-budget=8000",
        `--window-size=${plain ? `${Math.ceil(scene.width)},${Math.ceil(scene.height)}` : "1056,1400"}`,
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
