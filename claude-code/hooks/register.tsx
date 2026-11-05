import { atom, read, update } from "claude-code";
import type { EngineInterface, Register, RenderInput } from "claude-code";

import type { Entry, Mode } from "../types";

import { draw } from "./draw";
import { find, isScene, slim } from "./scene";
import type { Json } from "./scene";

const sketches = atom({ plugin: "sketchy", key: "sketches" } as const, {}, { shape: "sketches-2" });
const steps = atom({ plugin: "sketchy", key: "steps" } as const, {});
const mode = atom({ plugin: "sketchy", key: "mode" } as const, "auto" as Mode);

const KEEP = 30;
const CONTEXT =
  "The Sketchy plugin for Claude Code drew this diagram inline in the terminal, so the user sees it. " +
  "Explain it in 2-4 sentences instead of describing it, and do not mention any file paths.";
/** Terminal cells are about twice as tall as wide. */
const CELL_ASPECT = 0.5;
/** Scene pixels per terminal column at the drawing's natural size. */
const PIXELS_PER_COLUMN = 8;
const MAX_ROWS = 48;

type TerminalRender = Extract<RenderInput, { surface: "terminal" }>;

const isSketchTool = (tool: string) => /^mcp__.*sketchy.*__sketch$/.test(tool);

type Files = { scene: string; images?: unknown; page?: unknown };
const isFiles = (v: unknown): v is Files =>
  typeof v === "object" && v !== null && typeof (v as Files).scene === "string";
const hasFiles = (v: unknown) =>
  typeof v === "object" && v !== null && isFiles((v as { terminal?: unknown }).terminal);

/** Terminals that show pictures (kitty graphics or iTerm2 images). */
function showsImages(term: Terminal, fullscreen: boolean): boolean {
  const program = term.program?.toLowerCase() ?? "";
  if (program === "ghostty" || program === "wezterm") return true;
  if (term.kitty || term.type?.includes("kitty")) return true;
  return program === "iterm.app" && fullscreen;
}
type Terminal = { program?: string; kitty?: string; type?: string };

// ---------------------------------------------------------------- hooks

export const register: Register = (on) => {
  on("tool.call", async ($, e, next) => {
    if (!isSketchTool(e.tool)) return next(e);
    const ran = await next(e);
    if ("deny" in ran && ran.deny !== undefined) return ran;
    if (ran.isError) return ran;
    let entry: Entry;
    try {
      const holder = find(ran.result, hasFiles) as { terminal: Files } | undefined;
      if (holder) {
        const files = holder.terminal;
        const scene = find(JSON.parse(await $.fs.read(files.scene)), isScene) as Json | undefined;
        entry = scene
          ? {
              sketch: slim(scene),
              images: Array.isArray(files.images) ? files.images.map(String) : [],
              page: typeof files.page === "string" ? files.page : undefined,
            }
          : { problem: `no scene in ${files.scene}` };
      } else {
        const scene = find(ran.result, isScene) as Json | undefined;
        entry = scene
          ? { sketch: slim(scene) }
          : {
              problem:
                "the Sketchy server sent no drawing for the terminal. Update it: the plugin needs @ddkbs/sketchy 0.2.0 or later.",
            };
      }
    } catch (error) {
      entry = { problem: String(error) };
    }
    await update($, sketches, (all) => {
      const keys = Object.keys(all).slice(-(KEEP - 1));
      const kept: Record<string, Entry> = {};
      for (const k of keys) kept[k] = all[k]!;
      kept[e.tool_use_id] = entry;
      return kept;
    });
    if (!entry.sketch) return ran;
    return { ...ran, context: [...(ran.context ?? []), CONTEXT] };
  }).catch(($, e, next) => next(e));

  // A standalone call's result block.
  on("ui.render", { component: "ToolResult" }, async ($, e, next) => {
    if (e.surface !== "terminal" || !isSketchTool(e.props.tool) || e.props.isErrored)
      return next(e);
    const drawing = await renderSketch($, e, e.props.tool_use_id);
    return drawing ?? next(e);
  });

  // Claude Code folds runs of MCP calls into one summary line and draws no
  // result block for them; the drawings go under that line instead.
  on("ui.render", { component: "ToolGroup" }, async ($, e, next) => {
    if (e.surface !== "terminal" || e.props.isExpanded) return next(e);
    const ids = e.props.calls
      .filter((c) => isSketchTool(c.tool) && !c.isRunning && !c.isErrored && c.tool_use_id)
      .map((c) => c.tool_use_id!);
    if (!ids.length) return next(e);
    const drawings = [];
    for (const id of ids) {
      const drawing = await renderSketch($, e, id);
      if (drawing) drawings.push(drawing);
    }
    if (!drawings.length) return next(e);
    const { Box } = $.ui.resolve(e);
    const line = await next(e);
    return (
      <Box flexDirection="column">
        {line}
        {drawings}
      </Box>
    );
  });
};

/** The drawing of one sketch call, or undefined when the plugin has none for it. */
async function renderSketch($: EngineInterface, e: TerminalRender, id: string) {
  const entry = (await read($, sketches))[id];
  if (!entry) return undefined;
  const { Box, Text, Button, Raster, Image, Link } = $.ui.resolve(e);
  if (!entry.sketch)
    return (
      <Text key={id} dimColor>
        Sketchy could not show this drawing: {entry.problem}
      </Text>
    );
  const sketch = entry.sketch;
  const step = (await read($, steps))[id] ?? -1;
  const go = (to: number) => update($, steps, (all) => ({ ...all, [id]: to }));
  const active = sketch.steps[step];
  const available = Math.max(40, (e.viewport?.columns ?? 100) - 6);

  const chosen = await read($, mode);
  const images = entry.images ?? [];
  const canPicture = images.length > 0;
  const program = (await $.env.get("TERM_PROGRAM"))?.toLowerCase();
  const picture =
    canPicture &&
    (chosen === "image" ||
      (chosen === "auto" &&
        showsImages(
          {
            program,
            kitty: await $.env.get("KITTY_WINDOW_ID"),
            type: await $.env.get("TERM"),
          },
          e.viewport?.isFullscreen === true,
        )));
  const image = images[step + 1] ?? images[0];

  let body;
  if (picture && image) {
    let columns = Math.min(available, Math.ceil(sketch.width / PIXELS_PER_COLUMN));
    let rows = Math.round(((columns * sketch.height) / sketch.width) * CELL_ASPECT);
    if (rows > MAX_ROWS) {
      columns = Math.max(20, Math.round((columns * MAX_ROWS) / rows));
      rows = MAX_ROWS;
    }
    // iTerm2 shows image bytes only; kitty-protocol terminals read the file.
    const source =
      program === "iterm.app"
        ? { png: (await $.fs.read(image, { as: "bytes" })).base64 }
        : { file: image, format: "png" as const };
    body = (
      <Image
        key={`sketch-${id}`}
        source={source}
        columns={Math.max(1, columns)}
        rows={Math.max(1, rows)}
        alt={sketch.title ?? "Sketchy drawing"}
      />
    );
  } else {
    const cells = draw(sketch, available, step);
    body = (
      <Raster key={`sketch-${id}`} columns={cells.columns} rows={cells.rows} cells={cells.data} />
    );
  }

  return (
    <Box key={id} flexDirection="column" marginTop={1}>
      {sketch.title && !picture ? <Text bold>{sketch.title}</Text> : null}
      {sketch.subtitle && !picture ? <Text dimColor>{sketch.subtitle}</Text> : null}
      {body}
      {sketch.steps.length > 0 ? (
        <Box flexDirection="row" gap={1}>
          <Button key={`prev-${id}`} label="◀" onPress={() => go(Math.max(-1, step - 1))} />
          <Button
            key={`next-${id}`}
            label="▶"
            onPress={() => go(Math.min(sketch.steps.length - 1, step + 1))}
          />
          <Text>
            {active ? (
              <Text>
                <Text bold>
                  {step + 1}/{sketch.steps.length} {active.title}
                </Text>
                {active.text ? ` – ${active.text}` : ""}
              </Text>
            ) : (
              <Text dimColor>Walk through {sketch.steps.length} steps</Text>
            )}
          </Text>
        </Box>
      ) : null}
      <Box flexDirection="row" gap={2}>
        {entry.page ? (
          <Link key={`open-${id}`} href={`file://${entry.page}`} label="↗ Open interactive" />
        ) : null}
        {canPicture ? (
          <Button
            key={`mode-${id}`}
            label={picture ? "Show as text" : "Show as picture"}
            onPress={() => update($, mode, () => (picture ? "text" : "image"))}
          />
        ) : null}
        {!picture && sketch.extras > 0 ? (
          <Text dimColor>Circuit parts and photos show in the picture or the browser.</Text>
        ) : null}
      </Box>
    </Box>
  );
}
