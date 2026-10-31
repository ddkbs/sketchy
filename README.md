<h1 align="center">Sketchy</h1>

<p align="center"><em>Totally sketchy explanations.</em></p>

<p align="center">
  <a href="https://github.com/ddkbs/sketchy/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/ddkbs/sketchy?style=flat-square&color=1d1d1f"></a>
  <a href="https://github.com/ddkbs/sketchy/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/ddkbs/sketchy/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-1a5fb4?style=flat-square"></a>
</p>

<p align="center">
  <img alt="macOS" src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white">
  <img alt="Windows" src="https://img.shields.io/badge/Windows-0078D4?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0zIDNoOC41djguNUgzek0xMi41IDNIMjF2OC41aC04LjV6TTMgMTIuNWg4LjVWMjFIM3pNMTIuNSAxMi41SDIxVjIxaC04LjV6Ii8+PC9zdmc+">
  <img alt="Linux" src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black">
  <img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-D97757?style=for-the-badge&logo=claude&logoColor=white">
  <img alt="MCP Apps" src="https://img.shields.io/badge/MCP_Apps-1d1d1f?style=for-the-badge&logo=modelcontextprotocol&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
</p>

Sketchy is an [MCP](https://modelcontextprotocol.io) server that lets Claude **draw while it explains**: clean, hand-drawn, interactive diagrams rendered right next to the answer.

Claude decides **what** to draw and label. Sketchy decides **where**: a part library with named anchor points and automatic layout. Claude never computes coordinates, so drawings come out precise and consistent every time.

> [!NOTE]
> Sketchy currently draws in **Claude Code** sessions of the Claude desktop app. Support for the regular **Claude chat** (desktop, web and mobile) is planned for an upcoming release.

![The life of a web request, from the browser through CDN, load balancer and services to cache, database and queue](docs/images/request.png)

## What it can draw

### Systems, step by step

Ask _"What happens when I open a web page?"_ and Claude draws the whole path, then walks you through it. Each step circles what matters in red pen and fades the rest. Use the buttons or the arrow keys.

![Step 5 of the walkthrough: the orders service, cache and database are circled](docs/images/request-step.png)

### Concepts from computer science and machine learning

Sketchy is not limited to hardware. Structure, flow, comparison and metaphor patterns cover any topic, from transformers to TCP.

![How an LLM picks the next word: tokenizer, embeddings, a transformer block with self-attention and MLP, and sampling](docs/images/transformer.png)

### Your own code

Ask _"Explain my repo"_. Claude reads the code and draws modules, folders and data flow. **Click a box to open the file** in VS Code, Cursor, Windsurf or Zed; hover to see what it does.

![Architecture of a repository with nested folders](docs/images/repo.png)

### Circuits from Arduino and ESP32 sketches

Ask _"How is my sketch wired?"_. Claude reads `pinMode`, `digitalWrite` and friends, places real parts (50 boards, sensors, displays and modules from [wokwi-elements](https://github.com/wokwi/wokwi-elements)) and connects pins by name. Sketchy routes the wires and places the callouts.

<table>
  <tr>
    <td width="58%"><img alt="ESP32 with PIR sensor, DHT22, buzzer and status LED" src="docs/images/esp32.png"></td>
    <td width="42%"><img alt="Arduino Uno driving an LED through a resistor" src="docs/images/circuit.png"></td>
  </tr>
</table>

### Labeled photos

Claude finds a freely licensed photo (Wikimedia Commons, Openverse), and a vision model **running on your computer** ([Florence-2](https://huggingface.co/microsoft/Florence-2-base-ft)) locates the parts and printed text to label. Attribution is always shown.

![Photo of an Arduino Uno with labeled parts](docs/images/photo.jpg)

### Comparisons and metaphors

<table>
  <tr>
    <td width="50%"><img alt="SQL vs. NoSQL side by side" src="docs/images/comparison.png"></td>
    <td width="50%"><img alt="CPU caches explained as a kitchen" src="docs/images/metaphor.png"></td>
  </tr>
</table>

### Interactive, exportable

- **Hover** any box, pin or wire for details.
- **Click** a code node to open the file, or a photo credit to open its source.
- **Export** as **SVG** or **PNG**, fonts included.
- **Fullscreen** where the host supports it.

## Install

### Claude desktop app

1. Download the `.mcpb` file for your platform from the [latest release](https://github.com/ddkbs/sketchy/releases/latest) (macOS on Apple Silicon, Windows or Linux).
2. Double-click it (or drag it into **Settings → Extensions**) and confirm.
3. Optional: in the extension settings choose your editor and where Sketchy stores its data.
4. Open the **Code** tab and start a session. Drawings appear inline next to Claude's answer.

In the **Chat** tab the tools run, but the drawing is not shown yet: the chat does not display views from locally installed extensions. Chat support is planned.

The photo-labeling model is **not** part of the download. The first time Claude labels a photo, Sketchy asks you to pick a model size:

| Model  | Download | Memory  | Notes                                     |
| ------ | -------- | ------- | ----------------------------------------- |
| Small  | ~280 MB  | ~1 GB   | Recommended. Printed text, distinct parts |
| Medium | ~830 MB  | ~2.5 GB | Better grounding of small parts           |
| Large  | ~3.1 GB  | ~4.5 GB | Most precise                              |

### Other MCP clients

Sketchy is a standard MCP server and works in any client that supports [MCP Apps](https://github.com/modelcontextprotocol/ext-apps):

```json
{
  "mcpServers": {
    "sketchy": {
      "command": "node",
      "args": ["/path/to/sketchy/dist/index.js"],
      "env": { "SKETCHY_EDITOR": "cursor" }
    }
  }
}
```

### Remote (experimental)

The drawing core has no local dependencies and can run as a hosted server. This is the groundwork for Claude chat support and not yet a supported setup:

```bash
node dist/index.js --http --port 3000
```

The endpoint is `http://<host>:3000/mcp` (Streamable HTTP, one scene per session). Photo labeling stays off in this mode unless `SKETCHY_PHOTOS=on`.

## Try it

- _"What happens when I open a web page? Walk me through it."_
- _"How does an LLM pick the next word?"_
- _"Explain the architecture of /path/to/my/repo, then walk me through one request."_
- _"How is this sketch wired?"_ followed by your `.ino` file
- _"Show me a photo of a Raspberry Pi and label the ports."_
- _"Compare TCP and UDP."_
- _"Explain CPU caches with an everyday metaphor."_

The same patterns are available as prompts: `explain-structure`, `explain-flow`, `compare`, `metaphor`, `explain-repo` and `explain-circuit`.

## How it works

```
Claude calls tools (sketch, add_node, place_part, connect, label, add_step, …)
          ↓
Scene: nodes, groups, parts, wires, labels, photos, steps — no coordinates
          ↓
Layout engine (elkjs): positions, orthogonal routing, collision-free callouts
          ↓
Viewer (MCP App): hand-drawn rendering with rough.js, hover, steps, export
```

Every feature fills the same scene, and a single viewer renders it. The visual style lives in the renderer, so every drawing looks consistent no matter what Claude asks for.

<details>
<summary>Tools</summary>

| Tool                                                | Purpose                                         |
| --------------------------------------------------- | ----------------------------------------------- |
| `sketch`                                            | Draw a whole scene in one call                  |
| `new_scene`, `render`                               | Build a scene incrementally, then show it       |
| `add_box`, `add_node`, `add_text`, `add_group`      | Boxes, code nodes (clickable), notes and groups |
| `add_arrow`, `add_edge`                             | Arrows between elements                         |
| `place_part`, `connect`, `search_parts`             | Electronic parts and wires                      |
| `label`                                             | Callouts on pins, photo regions or nodes        |
| `add_step`                                          | Walkthrough steps                               |
| `search_icons`                                      | Lucide icons and technology logos               |
| `find_image`, `locate`, `add_image`, `choose_model` | Photo search, local grounding, model setup      |

</details>

## Configuration

| Variable           | Default      | Description                                                                     |
| ------------------ | ------------ | ------------------------------------------------------------------------------- |
| `SKETCHY_EDITOR`   | `vscode`     | Editor for file links: `vscode`, `cursor`, `windsurf`, `vscode-insiders`, `zed` |
| `SKETCHY_PHOTOS`   | `on`         | `off` disables photo search and labeling                                        |
| `SKETCHY_DATA_DIR` | `~/.sketchy` | Models, cached photos and the local SQLite database                             |

## Development

Requires Node.js 20 or later.

```bash
npm install
npm run build      # part catalog, server and viewer
npm test
npm run preview    # viewer with sample scenes at http://localhost:5173/preview.html
npm run pack       # .mcpb bundle for the current platform
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project layout.

## License

[MIT](LICENSE) © ddkbs. Sketchy builds on open-source work listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
