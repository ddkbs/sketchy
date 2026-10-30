import { z } from "zod";

/** Zod shapes shared by the single-element tools and the `sketch` tool. */

const id = z.string().describe("Unique id, e.g. 'api' (letters, digits, '_' or '-')");
const tone = z
  .enum(["default", "accent", "muted"])
  .optional()
  .describe("accent = key element, muted = context");

export const nodeShape = {
  id,
  label: z.string().describe("Short text shown in the box (1–4 words)"),
  description: z.string().optional().describe("Longer explanation shown on hover"),
  file: z.string().optional().describe("Absolute path of a source file; clicking opens it"),
  line: z.number().int().positive().optional().describe("Line in `file` to open"),
  group: z.string().optional().describe("Id of the group this node belongs to"),
  icon: z.string().optional().describe("Icon, e.g. 'lucide:database' or 'simple-icons:react'"),
  shape: z
    .enum(["box", "rounded", "circle", "cylinder", "note", "person", "text"])
    .optional()
    .describe("cylinder = storage, person = actor, note = remark, text = plain text"),
  tone,
};

export const edgeShape = {
  from: z.string().describe("Id of the source node, group, part or image"),
  to: z.string().describe("Id of the target node, group, part or image"),
  label: z.string().optional().describe("Short text on the arrow"),
  style: z.enum(["solid", "dashed"]).optional(),
  tone,
  bidirectional: z.boolean().optional().describe("Arrowheads on both ends"),
};

export const groupShape = {
  id,
  label: z.string().describe("Title of the group, e.g. a folder or layer name"),
  parent: z.string().optional().describe("Id of an enclosing group"),
  description: z.string().optional(),
};

export const partShape = {
  id,
  type: z.string().describe("Part type from search_parts, e.g. 'arduino-uno', 'led', 'resistor'"),
  label: z.string().optional().describe("Caption under the part, e.g. 'R1 220Ω'"),
  props: z
    .record(z.string(), z.string())
    .optional()
    .describe('Visual variant, e.g. {"color":"red"} for an LED or {"value":"220"} for a resistor'),
  group: z.string().optional(),
};

export const wireShape = {
  from: z.string().describe("Pin reference 'partId.pin', e.g. 'uno.D13'"),
  to: z.string().describe("Pin reference 'partId.pin', e.g. 'led1.A'"),
  color: z
    .enum(["red", "black", "blue", "green", "yellow", "orange", "purple", "gray", "white"])
    .optional()
    .describe("red = power, black = GND"),
  label: z.string().optional(),
};

export const labelShape = {
  target: z.string().describe("Id of the part, image or node to annotate"),
  anchor: z.string().optional().describe("Pin name of a part or region name of an image"),
  text: z.string().describe("Annotation text"),
};

export const stepShape = {
  title: z.string().describe("Short step title"),
  text: z.string().optional().describe("One or two sentences"),
  highlight: z.array(z.string()).describe("Ids to emphasize; edge ids look like 'from->to'"),
};

export const sceneMetaShape = {
  title: z.string().optional().describe("Headline of the drawing"),
  subtitle: z.string().optional(),
  direction: z
    .enum(["right", "down"])
    .optional()
    .describe("Main flow direction; omit to let Sketchy choose the most readable"),
};

export const sketchShape = {
  ...sceneMetaShape,
  groups: z.array(z.object(groupShape)).optional(),
  nodes: z.array(z.object(nodeShape)).optional(),
  edges: z.array(z.object(edgeShape)).optional(),
  parts: z.array(z.object(partShape)).optional(),
  wires: z.array(z.object(wireShape)).optional(),
  labels: z.array(z.object(labelShape)).optional(),
  steps: z.array(z.object(stepShape)).optional(),
  images: z
    .array(z.string())
    .optional()
    .describe("Ids of images from find_image to include (locate them first for region labels)"),
};
