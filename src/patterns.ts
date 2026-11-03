/**
 * Explanation patterns shipped to Claude as server instructions and prompts.
 * They encode *how* to explain; the tools encode *what* can be drawn.
 */

export const INSTRUCTIONS = `Sketchy draws hand-sketched, interactive diagrams inside the chat.
You describe structure; Sketchy computes every position. Never pass coordinates.

Fast path: call \`sketch\` once with the whole scene (nodes, edges, groups, parts, wires, labels, steps). Use the small tools (add_box, add_node, add_edge, place_part, connect, label, add_step, …) followed by \`render\` when building incrementally.

Pick one explanation pattern per drawing:
- structure ("what is it made of?"): components as nodes or parts, groups for areas, labels for the important bits. Direction "down" for hierarchies.
- flow ("how does it work / what happens when …?"): a left-to-right chain of nodes and arrows plus one step per stage (add_step) so the user can walk through it.
- comparison ("X vs Y"): one group per option with parallel nodes inside, same order in each group; muted tone for what is equal, accent tone for the key difference.
- metaphor ("explain it simply"): map the unfamiliar thing to an everyday one; one group per side, dashed edges from each real element to its everyday counterpart.

Quality rules:
- 3–12 nodes. Short labels (1–4 words); put details into description (shown on hover).
- Use icons sparingly ("lucide:database", "simple-icons:react") to aid recognition.
- tone "accent" for at most one or two key elements; "muted" for context.
- Steps: 3–7 steps, each highlights the elements that matter in it; text is one or two sentences.

Code → diagram: read the repository yourself, then draw modules as nodes (file = absolute path, so clicking opens it), folders/packages as groups, imports or data flow as edges. Edges point in the direction data or control flows.

Circuits: read the sketch (pinMode, digitalWrite, analogRead, libraries), use search_parts to find part types and pins, place_part each component, then connect pins ("uno.D13" → "led1.A"). Use wire colors: red for power, black for GND, other colors for signals. A resistor in series with every LED.

Photo labeling: find_image → pick a candidate → locate(image, ["USB port", "power jack", …]) → add_image → label(image, region, text) → render. Keep the attribution; it is always shown.`;

export type Pattern = {
  name: string;
  title: string;
  description: string;
  argument: { name: string; description: string };
  template: (value: string) => string;
};

export const PATTERNS: Pattern[] = [
  {
    name: "explain-structure",
    title: "Explain the structure of something",
    description: "Labeled drawing of what a thing is made of.",
    argument: { name: "subject", description: "What to explain, e.g. 'the Arduino Uno'" },
    template: (subject) =>
      `Explain the structure of ${subject} with Sketchy. Use the structure pattern: the main components as nodes or parts, groups for areas, labels for the important details, and 2–4 sentences of explanation alongside the drawing.`,
  },
  {
    name: "explain-flow",
    title: "Explain how something works, step by step",
    description: "Flow diagram with a guided step-by-step walkthrough.",
    argument: { name: "process", description: "The process, e.g. 'an HTTP request'" },
    template: (process) =>
      `Explain how ${process} works with Sketchy. Use the flow pattern: a left-to-right chain of nodes and arrows, then add one step per stage that highlights the involved elements. Keep each step to one or two sentences.`,
  },
  {
    name: "compare",
    title: "Compare two or more things",
    description: "Side-by-side comparison that highlights the key differences.",
    argument: { name: "options", description: "What to compare, e.g. 'SQL vs NoSQL'" },
    template: (options) =>
      `Compare ${options} with Sketchy. Use the comparison pattern: one group per option containing parallel nodes in the same order, muted tone for what they share and accent tone for the decisive differences.`,
  },
  {
    name: "metaphor",
    title: "Explain with an everyday metaphor",
    description: "Maps an unfamiliar concept onto something familiar.",
    argument: { name: "concept", description: "The concept, e.g. 'a CPU cache'" },
    template: (concept) =>
      `Explain ${concept} with an everyday metaphor in Sketchy. Use the metaphor pattern: one group for the real concept and one for the everyday counterpart, with dashed edges connecting matching elements.`,
  },
  {
    name: "explain-repo",
    title: "Explain a code repository",
    description: "Architecture diagram of a codebase; clicking a box opens the file.",
    argument: { name: "path", description: "Absolute path of the repository" },
    template: (path) =>
      `Read the repository at ${path} and explain its architecture with Sketchy. Draw modules as nodes with absolute file paths, folders or packages as groups and imports or data flow as edges. Then add steps that follow one typical request or command through the system.`,
  },
  {
    name: "explain-circuit",
    title: "Draw the wiring of an Arduino sketch",
    description: "Wiring diagram generated from Arduino code.",
    argument: { name: "sketch", description: "Path of the .ino file or the code itself" },
    template: (sketch) =>
      `Read this Arduino sketch and draw its wiring with Sketchy: ${sketch}\nUse search_parts to find parts and pins, place_part for every component, connect for every wire (red = power, black = GND) and label the pins that matter. Explain the circuit briefly.`,
  },
];

/** Compact mode: short instructions; the syntax lives in the sketch tool's description. */
export const COMPACT_INSTRUCTIONS = `Sketchy draws hand-sketched, interactive diagrams in the chat. Call sketch once with the whole scene; Sketchy computes all positions. Then explain in 2-4 sentences instead of describing the drawing.

Patterns: flow (left-to-right chain + one step per stage), structure (groups for areas, dir down for hierarchies), comparison (one group per option, parallel nodes, !accent on the key difference), metaphor (real vs everyday group, dashed links). 3-12 nodes, labels 1-4 words, details after ~. Icons sparingly; !accent on 1-2 elements. 3-7 steps.

Follow-ups: to change an earlier drawing, send the whole scene again with the same ids; elements that stay keep their places.
Circuits: search_parts for types and pins, then part and wire lines (red power, black GND, a resistor with every LED).
Photos: find_image, locate the regions, then sketch with an image line and label lines for the regions. Keep the attribution.`;

export const COMPACT_SYNTAX = `Draw a whole scene and show it. One element per line:
title <text> | subtitle <text> | dir right|down
group <id> <label> [in <parent>]
<id> <label> [@icon] [(cylinder|person|note|circle|rounded|text)] [in <group>] [!accent|!muted] [file=<absolute path>] [~ hover text]
<a> -> <b> [label] [!accent|!muted]   (--> dashed, <-> both ends)
label <id>[.<pin>] <text>      (photo region with spaces: label <image>.<region>: <text>)
image <id from find_image>
step <title>: <text> | <ids to highlight; edges as a->b>
part <id> <type> [key=value] [caption]   (types and pins: search_parts)
wire <part.pin> -> <part.pin> [red|black|blue|green|yellow|orange|purple|gray|white]
Icons: @globe, @database, @server (Lucide) or @simple-icons:react. Ids: letters, digits, _ or -.`;
