import { SceneError } from "./builder.js";

/**
 * A compact line syntax for whole scenes, about half the tokens of the JSON
 * form. It parses into the same input the `sketch` tool takes.
 *
 *   title How DNS works
 *   dir right
 *   group net The internet
 *   browser Browser @globe
 *   dns DNS @book-open in net !accent ~ The phone book of the internet
 *   db Database (cylinder) in net
 *   browser -> dns lookup
 *   dns --> db            (dashed; <-> for both ends)
 *   label db Postgres
 *   step Find the address: DNS turns the name into an IP | browser dns browser->dns
 */
export type CompactScene = {
  title?: string;
  subtitle?: string;
  direction?: "right" | "down";
  groups: { id: string; label: string; parent?: string }[];
  nodes: {
    id: string;
    label: string;
    icon?: string;
    group?: string;
    shape?: "box" | "rounded" | "circle" | "cylinder" | "note" | "person" | "text";
    tone?: "accent" | "muted";
    description?: string;
    file?: string;
  }[];
  edges: {
    from: string;
    to: string;
    label?: string;
    style?: "dashed";
    bidirectional?: boolean;
    tone?: "accent" | "muted";
  }[];
  labels: { target: string; anchor?: string; text: string }[];
  steps: { title: string; text?: string; highlight: string[] }[];
  parts: { id: string; type: string; label?: string; props?: Record<string, string> }[];
  wires: { from: string; to: string; color?: WireColor; label?: string }[];
  /** Photo ids from find_image. */
  images: string[];
};

type WireColor =
  "red" | "black" | "blue" | "green" | "yellow" | "orange" | "purple" | "gray" | "white";

const SHAPES = new Set(["box", "rounded", "circle", "cylinder", "note", "person", "text"]);
const COLORS = new Set([
  "red",
  "black",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "gray",
  "white",
]);
const ID = "[A-Za-z0-9_-]+";
const EDGE = new RegExp(`^(${ID})\\s*(<->|-->|->)\\s*(${ID})(?:\\s+(.*))?$`);
const WIRE = new RegExp(
  `^wire\\s+(${ID}\\.\\S+)\\s*->\\s*(${ID}\\.\\S+)(?:\\s+(\\w+))?(?:\\s+(.*))?$`,
);

export function parseCompact(source: string): CompactScene {
  const scene: CompactScene = {
    groups: [],
    nodes: [],
    edges: [],
    labels: [],
    steps: [],
    parts: [],
    wires: [],
    images: [],
  };
  source.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    // Block closers some models add out of habit carry no meaning here.
    if (!line || line.startsWith("#") || /^(end|\}|\{)$/.test(line)) return;
    const fail = (why: string) => {
      throw new SceneError(`Line ${index + 1} ("${line}"): ${why}`);
    };
    const [head, ...rest] = line.split(/\s+/);
    const tail = rest.join(" ");
    switch (head) {
      case "title":
        scene.title = tail;
        return;
      case "subtitle":
        scene.subtitle = tail;
        return;
      case "dir":
        if (tail !== "right" && tail !== "down") fail('dir must be "right" or "down"');
        scene.direction = tail as "right" | "down";
        return;
      case "group": {
        const m = tail.match(new RegExp(`^(${ID})\\s+(.+?)(?:\\s+in\\s+(${ID}))?$`));
        if (!m) fail("expected: group <id> <label> [in <parent>]");
        scene.groups.push(strip({ id: m![1]!, label: m![2]!, parent: m![3] }));
        return;
      }
      case "image": {
        const m = tail.match(new RegExp(`^(${ID})$`));
        if (!m) fail("expected: image <id from find_image>");
        scene.images.push(m![1]!);
        return;
      }
      case "label": {
        // Photo regions may contain spaces: label <image>.<region>: <text>
        const region = tail.match(new RegExp(`^(${ID})\\.([^:]+):\\s+(.+)$`));
        if (region) {
          scene.labels.push({ target: region[1]!, anchor: region[2]!.trim(), text: region[3]! });
          return;
        }
        const m = tail.match(new RegExp(`^(${ID})(?:\\.(\\S+))?\\s+(.+)$`));
        if (!m) fail("expected: label <target>[.anchor] <text>");
        scene.labels.push(strip({ target: m![1]!, anchor: m![2], text: m![3]! }));
        return;
      }
      case "step": {
        const m = tail.match(/^([^:|]+?)(?::\s*([^|]*))?\|\s*(.+)$/);
        if (!m) fail("expected: step <title>: <text> | <ids>");
        scene.steps.push(
          strip({
            title: m![1]!.trim(),
            text: m![2]?.trim() || undefined,
            highlight: m![3]!.split(/[\s,]+/).filter(Boolean),
          }),
        );
        return;
      }
      case "part": {
        const m = tail.match(new RegExp(`^(${ID})\\s+(${ID})(.*)$`));
        if (!m) fail("expected: part <id> <type> [key=value …] [label]");
        const props: Record<string, string> = {};
        const words: string[] = [];
        for (const w of m![3]!.trim().split(/\s+/).filter(Boolean)) {
          const kv = w.match(/^(\w+)=(\S+)$/);
          if (kv) props[kv[1]!] = kv[2]!;
          else words.push(w);
        }
        scene.parts.push(
          strip({
            id: m![1]!,
            type: m![2]!,
            label: words.join(" ") || undefined,
            props: Object.keys(props).length ? props : undefined,
          }),
        );
        return;
      }
    }
    const wire = line.match(WIRE);
    if (wire) {
      const color = wire[3] && COLORS.has(wire[3]) ? (wire[3] as WireColor) : undefined;
      const label = [color ? undefined : wire[3], wire[4]].filter(Boolean).join(" ") || undefined;
      scene.wires.push(strip({ from: wire[1]!, to: wire[2]!, color, label }));
      return;
    }
    const edge = line.match(EDGE);
    if (edge) {
      // Edges have no hover text; drop a "~ …" note rather than print it on the arrow.
      let label = splitOnce(edge[4] ?? "", " ~ ")[0].trim();
      let tone: "accent" | "muted" | undefined;
      const toneMatch = label?.match(/(?:^|\s)!(accent|muted)$/);
      if (toneMatch) {
        tone = toneMatch[1] as "accent" | "muted";
        label = label!.slice(0, toneMatch.index).trim();
      }
      scene.edges.push(
        strip({
          from: edge[1]!,
          to: edge[3]!,
          label: label || undefined,
          style: edge[2] === "-->" ? ("dashed" as const) : undefined,
          bidirectional: edge[2] === "<->" || undefined,
          tone,
        }),
      );
      return;
    }
    scene.nodes.push(parseNode(line, fail));
  });
  return scene;
}

function parseNode(line: string, fail: (why: string) => never): CompactScene["nodes"][number] {
  const [main, description] = splitOnce(line, " ~ ");
  const m = main.match(new RegExp(`^(${ID})\\s+(.+)$`));
  if (!m)
    fail(
      "expected a node: <id> <label> [@icon] [(shape)] [in <group>] [!accent|!muted] [~ description]",
    );
  const node: CompactScene["nodes"][number] = { id: m![1]!, label: "" };
  const words: string[] = [];
  const tokens = m![2]!.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.startsWith("@") && t.length > 1)
      node.icon = t.includes(":") ? t.slice(1) : `lucide:${t.slice(1)}`;
    else if (/^\(\w+\)$/.test(t) && SHAPES.has(t.slice(1, -1)))
      node.shape = t.slice(1, -1) as typeof node.shape;
    else if (t === "!accent" || t === "!muted") node.tone = t.slice(1) as "accent" | "muted";
    else if (t === "in" && tokens[i + 1] && new RegExp(`^${ID}$`).test(tokens[i + 1]!))
      node.group = tokens[++i];
    else if (t.startsWith("file=")) node.file = t.slice(5);
    else words.push(t);
  }
  node.label = words.join(" ");
  if (!node.label) fail("a node needs a label");
  if (description) node.description = description.trim();
  return node;
}

function splitOnce(text: string, separator: string): [string, string | undefined] {
  const at = text.indexOf(separator);
  return at < 0 ? [text, undefined] : [text.slice(0, at), text.slice(at + separator.length)];
}

function strip<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) if (value[key] === undefined) delete value[key];
  return value;
}
