# Contributing

Thanks for helping improve Sketchy! Bug reports, part requests and pull requests are welcome.

## Setup

```bash
npm install
npm run build
npm test
```

`npm run preview` starts the viewer with sample scenes (`/preview.html`) and a
test host that drives the real viewer over the MCP Apps protocol (`/host.html`).

## Project layout

| Path             | Contents                                                     |
| ---------------- | ------------------------------------------------------------ |
| `src/scene/`     | Scene types and the validating `SceneBuilder`                |
| `src/layout/`    | elkjs layout, text metrics, callout placement, editor links  |
| `src/parts/`     | SQLite part index built from `build/parts.json`              |
| `src/photos/`    | Photo search, caching, Florence-2 grounding, photo tools     |
| `src/storage/`   | sql.js helpers and the persistent local database             |
| `src/server.ts`  | MCP tools, prompts and the viewer resource                   |
| `src/exports.ts` | Save dialog for SVG and PNG exports (local server only)      |
| `viewer/`        | The MCP App (rough.js renderer, steps, export, model picker) |
| `web/`           | Browser bundle of the drawing core for the chat skill        |
| `skill/`         | The chat skill: `SKILL.md` and its fallback render script    |
| `website/`       | The project website and docs                                 |
| `scripts/`       | Part extraction, preview data and bundle packaging           |
| `test/`          | Vitest suites and shared fixtures                            |

## Principles

- **The model never computes coordinates.** Tools accept structure; the layout engine owns geometry.
- **The style lives in the renderer.** Tools cannot change colors or fonts beyond the fixed tones.
- **The drawing core stays portable.** No filesystem or model dependencies outside `src/photos/`, `src/storage/database.ts` and `src/exports.ts`, so the same core runs in the browser bundle.
- **Errors teach.** Tool errors say what is wrong and how to fix it (known pins, similar part types, …).

## Pull requests

- Keep changes focused and covered by tests where the logic is pure (validation, layout input, anchors).
- Run `npm run typecheck`, `npm test` and `npm run format:check` before pushing.
- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat(layout): …`, `fix(viewer): …`).
