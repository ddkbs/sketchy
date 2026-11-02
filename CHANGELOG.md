# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/ddkbs/sketchy/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/ddkbs/sketchy/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/ddkbs/sketchy/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/ddkbs/sketchy/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/ddkbs/sketchy/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/ddkbs/sketchy/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ddkbs/sketchy/releases/tag/v0.1.0
