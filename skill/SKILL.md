---
name: sketchy
description: Draws hand-sketched, interactive diagrams (architecture, flows with step-by-step walkthroughs, comparisons, metaphors, Arduino circuits) as an HTML page the user can open in the chat. Use whenever a concept, system, process or comparison is easier to understand as a drawing, or when the user asks for a sketch, diagram or visual explanation.
---

# Sketchy

You describe **what** to draw as JSON; Sketchy computes every position and renders it in a hand-drawn style with hover details and step navigation. Never pass coordinates.

## Workflow

1. Write the scene as JSON to a file, e.g. `/tmp/scene.json`.
2. Render it with the script in this skill's folder (Node.js, no network needed):

   ```bash
   node <skill-folder>/scripts/render.mjs /tmp/scene.json /mnt/user-data/outputs/<short-name>.html
   ```

   Write to the folder whose files the user can open (in claude.ai: `/mnt/user-data/outputs`).

3. If the script prints an error, fix the field it names and run it again.
4. Share the HTML file with the user so it opens in the chat, then explain the drawing in 2–4 sentences instead of describing it again.

## Scene JSON

```json
{
  "title": "How a web request works",
  "subtitle": "optional",
  "direction": "right",
  "groups": [{ "id": "net", "label": "Internet" }],
  "nodes": [
    {
      "id": "browser",
      "label": "Browser",
      "icon": "lucide:globe",
      "description": "Shown on hover"
    },
    { "id": "server", "label": "Server", "group": "net", "tone": "accent" },
    { "id": "db", "label": "Database", "group": "net", "shape": "cylinder" }
  ],
  "edges": [
    { "from": "browser", "to": "server", "label": "HTTPS" },
    { "from": "server", "to": "db", "style": "dashed" }
  ],
  "labels": [{ "target": "db", "text": "Postgres" }],
  "steps": [
    {
      "title": "Request",
      "text": "One or two sentences.",
      "highlight": ["browser", "browser->server"]
    }
  ]
}
```

- `direction`: `"right"` or `"down"`; omit to let Sketchy choose.
- Nodes: `id`, `label` (1–4 words), optional `description`, `group`, `icon` (`lucide:<name>` or `simple-icons:<brand>`), `shape` (`box`, `rounded`, `circle`, `cylinder` = storage, `person` = actor, `note`, `text`), `tone` (`accent` = key element, `muted` = context).
- Groups: `id`, `label`, optional `parent` (another group id).
- Edges: `from`, `to` (node, group or part ids), optional `label`, `style` (`solid`, `dashed`), `tone`, `bidirectional`.
- Steps: `title`, `text`, `highlight` (ids; edge ids are `"from->to"`).
- Ids are unique across all elements; edges, labels and steps may only reference ids defined in the same scene.

## Explanation patterns

Pick one per drawing:

- **structure** ("what is it made of?"): components as nodes, groups for areas, labels for the important bits. Direction `down` for hierarchies.
- **flow** ("how does it work?"): a left-to-right chain of nodes and arrows plus one step per stage.
- **comparison** ("X vs Y"): one group per option with parallel nodes in the same order; `muted` for what is equal, `accent` for the key difference.
- **metaphor** ("explain it simply"): one group for the real thing, one for an everyday counterpart, dashed edges between matching elements.

Quality rules: 3–12 nodes; short labels with details in `description`; icons sparingly; `accent` for at most one or two elements; 3–7 steps of one or two sentences each.

## Circuits

Find part types and pin names first:

```bash
node <skill-folder>/scripts/render.mjs --parts "distance sensor"
node <skill-folder>/scripts/render.mjs --parts arduino-uno
```

Then add `"parts": [{ "id": "uno", "type": "arduino-uno" }, { "id": "r1", "type": "resistor", "props": { "value": "220" } }]` and `"wires": [{ "from": "uno.D13", "to": "r1.1", "color": "green" }]`. Red wires for power, black for GND, other colors for signals; a resistor in series with every LED.
