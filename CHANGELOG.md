# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-11-12

### Added

- Free drawing: a `draw` block with circles, ellipses, rectangles, lines, arrows, smooth curves, closed shapes, arcs and text on its own canvas, for pictures that boxes and arrows cannot show. It sits in a scene like a node. Sketchy places its labels, and steps can highlight single shapes or build the picture up in stages. Drawings also offer ready-made objects (person, car, tree, gear and more), icons, `repeat`, and sliders that move shapes, shifted as one piece with `move=` or along a path, by hand or step by step.
- Geometry helpers in drawings: `angle` (with the right-angle square), `measure` (dimension lines), `brace`, `axes` and `grid`, plus `let` to name a sub-expression.
- Molecules: `molecule <id> <SMILES>` draws the structural formula, rings, double bonds and hydrogens included.
- Maps: `map <id> <region>` with countries to colour, places by latitude and longitude, and routes between them (Natural Earth outlines).
- After drawing, Sketchy tells the AI about overlapping text and shapes that leave their canvas, at the start and in every step, so it can fix them before the user looks.
- Ready-made explanation shapes where the AI only names the contents: `timeline`, `cycle`, `pyramid`, `funnel`, `venn`, `matrix` and `mindmap`.
- `edit_sketch`: follow-up changes send only what changes instead of the whole scene.
- Setup instructions for Codex (`codex mcp add` and `config.toml`).

### Fixed

- In clients without MCP Apps (OpenCode, for example), `sketch` no longer claims the user sees the drawing. It saves an interactive, offline HTML file to `~/.sketchy/exports/`, returns its path and asks the AI to explain the diagram fully in text. `SKETCHY_OPEN=1` opens the file in the browser. Clients with MCP Apps behave as before.

## [0.1.8] - 2026-11-04

### Added

- Drawing mode: mark up a sketch with a red pen, a highlighter, notes and an eraser, then send a question to the AI together with the marked-up drawing and the names of the elements you marked. Marks are kept in SVG, PNG and Excalidraw exports.
- Export a drawing as an Excalidraw file (`.excalidraw`) to keep editing it on excalidraw.com: shapes, labels, groups and bound arrows stay editable; parts, icons and photos come along as images, photo credits included.
- A faint "sketchy" signature in the bottom-right corner of every drawing and export.

### Changed

- The website, README and package description name Cursor and VS Code next to Claude.
- The error for an expired drawing no longer assumes the client is Claude.
- The compact `sketch` syntax documents `file=<absolute path>` for nodes that link to source files.

## [0.1.7] - 2026-11-03

### Added

- Sketchy is on npm as `@ddkbs/sketchy`: `npx -y @ddkbs/sketchy` starts the server in Claude Code, Cursor, VS Code and other MCP clients, on every platform Node.js runs on.
- One-click install links for Cursor and VS Code on the website and in the README.
- Cursor plugin manifest (`.cursor-plugin/plugin.json` and `mcp.json`) for the Cursor Marketplace.
- Releases publish the npm package once the GitHub release is published.

### Changed

- The npm package leaves out the photo-labeling runtime (transformers.js, about 470 MB) and installs it into the data folder the first time a model is picked. The desktop extension still ships it.
- Claude Code in the terminal no longer needs a clone of the repository.

## [0.1.6] - 2026-11-02

**Efficiency update.** Claude now describes scenes in a compact line syntax and sees one short tool instead of fifteen. Measured with Claude Sonnet on five topics:

- Claude writes **41% fewer tokens per drawing** than with JSON scenes (686 instead of 1,168), and 29% fewer than for a plain-text answer.
- The tool definitions shrink by **88%**, from about 4,100 to about 500 tokens.
- A first drawing costs ~$0.043 instead of ~$0.059. Over a session of six questions Sketchy is now **cheaper than plain text** ($0.58 against $0.61) and 23% cheaper than before ($0.75).

### Added

- `sketchy-skill-0.1.6-pinned.zip` (added to the release after publication): a chat skill that loads the browser bundle from a fixed commit and verifies it with a Subresource Integrity hash. Every later release ships one too ([#1](https://github.com/ddkbs/sketchy/issues/1)).
- `sketchy-0.1.6-cursor-<platform>.zip` (added to the release after publication): the server as a plain folder for Cursor and other clients configured through `mcp.json`, with setup steps in the README. Every later release ships them too.
- Compact scene syntax for the `sketch` tool, the chat skill and the browser bundle (`browser -> server HTTPS`, `step Request: … | browser browser->server`), with tolerant parsing and errors that name the line.
- Follow-up drawings keep the order and places of the elements the previous drawing already showed, also when a back-edge closes a cycle.
- `SKETCHY_FORMAT=json` restores the JSON `sketch` tool and the incremental tools.

### Changed

- The extension offers `sketch`, `search_parts` and the photo tools; photos join a scene with an `image` line and region labels (`label <image>.<region>: <text>`).
- The chat skill uses the compact syntax.

## [0.1.5] - 2026-11-02

### Fixed

- Photo labeling no longer crashes the Claude desktop app: its built-in Node exits during inference with the medium and large models, so the app offers only the small model and falls back to it when a larger one was chosen elsewhere. Claude Code in the terminal keeps all three.

### Changed

- The project description, README, manifest and website describe Sketchy as a chat skill plus an extension for coding; the website showcases labeled photos.

## [0.1.4] - 2026-11-02

### Changed

- The chat skill loads the browser bundle of the current minor version, which every patch release refreshes, so installed skills pick up fixes without a new upload.
- The install guide starts with one question, where you use Claude: the skill for the chat, the extension for coding.

## [0.1.3] - 2026-11-02

### Added

- Skill for the Claude chat (`sketchy-skill-<version>.zip` on each release): Claude draws inline with its visualization tool, which loads Sketchy's browser bundle from jsDelivr. A bundled render script writes a standalone HTML page where no inline visualization is available.
- Browser bundle (`npm run build:web`) that lays out and draws a scene on any page; releases publish it to the `cdn` branch.

### Changed

- Hosts that cannot save files no longer show the SVG and PNG buttons.

## [0.1.2] - 2026-11-01

### Fixed

- SVG and PNG export now saves real files in hosts without file downloads, such as Claude: the local server opens the system's save dialog (macOS, Windows, Linux with zenity) and falls back to the Downloads folder. This replaces the save sheet from 0.1.1. After updating the extension, quit and reopen Claude so it loads the new viewer.

## [0.1.1] - 2026-11-01

### Added

- Install steps for Claude Code in the terminal.

### Fixed

- The SVG and PNG buttons now work in hosts without file downloads: the export opens as an image to save, drag out or copy.

## [0.1.0] - 2026-10-31

### Added

- Scene model with validated tools (`sketch`, `add_box`, `add_node`, `add_group`, `add_edge`, `label`, `add_step`, …); Claude describes structure, never coordinates.
- Automatic layout with elkjs: nested groups, orthogonal edge routing, edge labels and collision-free callout labels; picks the more readable flow direction.
- MCP App viewer with a consistent hand-drawn style (rough.js, Kalam handwriting font, fixed palette), hover details and click-to-open files in VS Code, Cursor, Windsurf or Zed.
- Step-by-step walkthroughs that circle the relevant elements and fade the rest.
- SVG and PNG export with embedded fonts.
- Part library of 50 wokwi-elements parts in a SQLite index with pin aliases (`D13`, `GND`, `anode`), plus `place_part`, `connect` and routed wires.
- Photo labeling: licensed photo search (Wikimedia Commons, Openverse), local Florence-2 grounding with OCR, annotated previews for verification, and a model picker with download progress.
- Explanation patterns (structure, flow, comparison, metaphor, repository, circuit) as server instructions and prompts.
- Streamable HTTP mode for remote deployments.
- MCP Bundle packaging for Claude Desktop, robust against unset extension settings.
- Viewer fallback that fetches the drawing by view id when a host does not forward result metadata.

### Known limitations

- Drawings appear in Claude Code sessions of the Claude desktop app. The regular Claude chat does not display views from local extensions yet; support is planned.
- Photo labeling is not available on Intel Macs (no ONNX Runtime build for macOS x64).

[Unreleased]: https://github.com/ddkbs/sketchy/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ddkbs/sketchy/compare/v0.1.8...v0.2.0
[0.1.8]: https://github.com/ddkbs/sketchy/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/ddkbs/sketchy/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/ddkbs/sketchy/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/ddkbs/sketchy/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/ddkbs/sketchy/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/ddkbs/sketchy/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/ddkbs/sketchy/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/ddkbs/sketchy/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ddkbs/sketchy/releases/tag/v0.1.0
