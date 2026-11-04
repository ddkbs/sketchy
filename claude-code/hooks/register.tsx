import { atom, read, update } from "claude-code";
import type { Register } from "claude-code";

import type { Entry } from "../types";

import { draw } from "./draw";
import { find, hasView, isScene, slim } from "./scene";
import type { Json } from "./scene";

const sketches = atom({ plugin: "sketchy", key: "sketches" } as const, {}, { shape: "sketches-1" });
const steps = atom({ plugin: "sketchy", key: "steps" } as const, {});

const KEEP = 30;
const CONTEXT =
  "The Sketchy plugin for Claude Code drew this diagram inline in the terminal, so the user sees it. " +
  "Explain it in 2-4 sentences instead of describing it, and do not mention a saved HTML file.";

const isSketchTool = (tool: string) => /^mcp__.*sketchy.*__sketch$/.test(tool);
const serverOf = (tool: string) => tool.slice("mcp__".length, tool.lastIndexOf("__"));

// ---------------------------------------------------------------- hooks

export const register: Register = (on) => {
  on("tool.call", async ($, e, next) => {
    if (!isSketchTool(e.tool)) return next(e);
    const ran = await next(e);
    if ("deny" in ran && ran.deny !== undefined) return ran;
    let entry: Entry;
    try {
      let scene = find(ran.result, isScene);
      if (!scene) {
        const view = find(ran.result, hasView) as Json | undefined;
        if (view) {
          const got = await $.mcp.call(serverOf(e.tool), "get_view", { view: view.view });
          scene = find(got, isScene);
        }
      }
      entry = scene
        ? { sketch: slim(scene as Json) }
        : { problem: `no scene in the result (${JSON.stringify(ran.result).slice(0, 300)})` };
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
    if (!entry.sketch || ran.isError) return ran;
    return { ...ran, context: [...(ran.context ?? []), CONTEXT] };
  }).catch(($, e, next) => next(e));

  on("ui.render", { component: "ToolResult" }, async ($, e, next) => {
    if (e.surface !== "terminal" || !isSketchTool(e.props.tool) || e.props.isErrored)
      return next(e);
    const entry = (await read($, sketches))[e.props.tool_use_id];
    if (!entry) return next(e);
    const { Box, Text, Button, Raster } = $.ui.resolve(e);
    if (!entry.sketch)
      return <Text dimColor>Sketchy could not show this drawing: {entry.problem}</Text>;
    const sketch = entry.sketch;
    const id = e.props.tool_use_id;
    const step = (await read($, steps))[id] ?? -1;
    const columns = Math.max(40, (e.viewport?.columns ?? 100) - 6);
    const cells = draw(sketch, columns, step);
    const go = (to: number) => update($, steps, (all) => ({ ...all, [id]: to }));
    const active = sketch.steps[step];
    return (
      <Box flexDirection="column">
        {sketch.title ? <Text bold>{sketch.title}</Text> : null}
        {sketch.subtitle ? <Text dimColor>{sketch.subtitle}</Text> : null}
        <Raster key="sketch" columns={cells.columns} rows={cells.rows} cells={cells.data} />
        {sketch.steps.length > 0 ? (
          <Box flexDirection="row" gap={1}>
            <Button key="prev" label="◀" onPress={() => go(Math.max(-1, step - 1))} />
            <Button
              key="next"
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
        {sketch.extras > 0 ? (
          <Text dimColor>Circuit parts and photos are only shown in the browser view.</Text>
        ) : null}
      </Box>
    );
  });
};
