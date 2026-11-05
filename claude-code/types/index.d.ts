/** The slice of a laid-out Sketchy scene the terminal draws. */
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type SketchNode = Rect & {
  id: string;
  lines: string[];
  group?: string;
  shape?: string;
  tone?: string;
};
export type SketchGroup = Rect & { id: string; label: string; parent?: string };
export type SketchEdge = {
  id: string;
  from: string;
  to: string;
  points: Pt[];
  dashed: boolean;
  both: boolean;
  tone?: string;
  label?: Rect & { lines: string[] };
};
export type SketchStep = { title: string; text?: string; highlight: string[] };
export type Sketch = {
  width: number;
  height: number;
  title?: string;
  subtitle?: string;
  groups: SketchGroup[];
  nodes: SketchNode[];
  edges: SketchEdge[];
  steps: SketchStep[];
  /** Parts, wires, labels and photos: not drawn in the terminal yet. */
  extras: number;
};
/** A drawing per tool call, or the reason none could be read. */
export type Entry = {
  sketch?: Sketch;
  /** PNGs the server rendered: the whole drawing, then one per step. */
  images?: string[];
  /** The interactive HTML page of the drawing. */
  page?: string;
  problem?: string;
};
/** How drawings show: pictures where the terminal can, characters elsewhere. */
export type Mode = "auto" | "image" | "text";

declare module "claude-code" {
  interface PluginState {
    sketchy: {
      /** The drawing of each sketch call, by tool use id. */
      sketches: Shaped<Record<string, Entry>>;
      /** The step each drawing shows; -1 or absent is the whole drawing. */
      steps: Record<string, number>;
      /** Picture or character drawing, switched by the user. */
      mode: Mode;
    };
  }
}
