# Sketchy

> Totally sketchy explanations.

Sketchy is a local [MCP](https://modelcontextprotocol.io) server for Claude Desktop that explains things **visually**: clean, interactive drawings rendered right inside the chat.

Claude decides **what** to draw and label. Sketchy decides **where** — through a library of parts with named anchor points and automatic layout. Claude never computes coordinates.

> [!NOTE]
> Sketchy is in early development. Nothing is released yet.

## What it does

- **Architecture diagrams** — "Explain my repo" turns into a diagram of modules and data flow. Click a box to open the file.
- **Step-by-step mode** — walk through a diagram one highlight at a time.
- **Circuit diagrams** — "How is my sketch wired?" turns Arduino code into a wiring diagram.
- **Photo labeling** — find a freely licensed photo and label its parts, with attribution always shown.
- **Export** — download any drawing as SVG or PNG.

## How it works

```
Claude calls tools (add_node, connect, add_step, …)
          ↓
Scene (JSON): parts, shapes, text, arrows, labels, steps
          ↓
Layout engine: computes all positions
          ↓
Viewer (MCP App): renders the scene in the chat
```

Every feature fills the same scene, and a single viewer renders it.

## Development

Requires Node.js 20 or later.

```bash
npm install
npm run build
```

## License

[MIT](LICENSE) © ddkbs
