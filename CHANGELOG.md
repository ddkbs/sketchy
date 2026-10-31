# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

First release, planned as 0.1.0.

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

[Unreleased]: https://github.com/ddkbs/sketchy/commits/main
