# Sketchy

Sketchy is an [MCP](https://modelcontextprotocol.io) server that lets Claude **draw while it explains**: clean, hand-drawn, interactive diagrams rendered right next to the answer.

Claude decides **what** to draw and label. Sketchy decides **where**: a part library with named anchor points and automatic layout. Claude never computes coordinates, so drawings come out precise and consistent every time.

![An interactive Sketchy drawing inside a Claude Code chat: what happens when you open a web page](docs/images/chat.png)

## What it can draw

### Systems, step by step

Ask _"What happens when I open a web page?"_ and Claude draws the whole path, then walks you through it. Each step circles what matters in red pen and fades the rest. Use the buttons or the arrow keys.

![The life of a web request, from the browser through CDN, load balancer and services to cache, database and queue](docs/images/request.png)

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
- **Export** as **SVG** or **PNG**, fonts included: your system's save dialog asks where to put the file.
- **Fullscreen** where the host supports it.

## Install

### Claude desktop app

1. Download the `.mcpb` file for your platform from the [latest release](https://github.com/ddkbs/sketchy/releases/latest) (macOS on Apple Silicon, Windows or Linux).
2. Double-click it (or drag it into **Settings → Extensions**) and confirm.
3. Optional: in the extension settings choose your editor and where Sketchy stores its data.
4. Open the **Code** tab and start a session. Drawings appear inline next to Claude's answer.

The **Chat** tab does not display views from locally installed extensions; for the chat, add the skill below.

The photo-labeling model is **not** part of the download. The first time Claude labels a photo, Sketchy asks you to pick a model size:

| Model  | Download | Memory  | Notes                                     |
| ------ | -------- | ------- | ----------------------------------------- |
| Small  | ~280 MB  | ~1 GB   | Recommended. Printed text, distinct parts |
| Medium | ~830 MB  | ~2.5 GB | Better grounding of small parts           |
| Large  | ~3.1 GB  | ~4.5 GB | Most precise                              |

### Claude chat (web, desktop and mobile)

Sketchy also comes as a skill that draws right in the chat, with no server and nothing to install locally:

1. Download `sketchy-skill-<version>.zip` from the [latest release](https://github.com/ddkbs/sketchy/releases/latest).
2. In Claude, open **Settings → Capabilities → Skills** and upload the zip.
3. Ask for a drawing in any chat.

Claude writes the scene, and the chat's inline visualization loads Sketchy's browser bundle from [jsDelivr](https://www.jsdelivr.com), which serves it from this repository's `cdn` branch. Nothing about your chat is sent anywhere else. Photo labeling and opening files from a drawing need your computer, so they stay in the desktop extension.

### Claude Code in the terminal

The terminal `claude` does not use desktop extensions, so register Sketchy once for all your projects:

```bash
git clone https://github.com/ddkbs/sketchy.git
cd sketchy && npm install && npm run build
claude mcp add sketchy --scope user -- node "$PWD/dist/index.js"
```

Run `claude mcp list` to check that it is connected.

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

| Variable             | Default       | Description                                                                       |
| -------------------- | ------------- | --------------------------------------------------------------------------------- |
| `SKETCHY_EDITOR`     | `vscode`      | Editor for file links: `vscode`, `cursor`, `windsurf`, `vscode-insiders`, `zed`   |
| `SKETCHY_PHOTOS`     | `on`          | `off` disables photo search and labeling                                          |
| `SKETCHY_DATA_DIR`   | `~/.sketchy`  | Models, cached photos and the local SQLite database                               |
| `SKETCHY_EXPORT_DIR` | `~/Downloads` | Folder the save dialog opens in, and where exports go when no dialog is available |

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
