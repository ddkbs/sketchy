import type { PartIndex } from "../parts/index.js";
import { resolveIcon } from "../icons.js";
import {
  emptyScene,
  type Direction,
  type NodeShape,
  type PinRef,
  type Scene,
  type SceneImage,
  type Tone,
  type WireColor,
} from "./types.js";

/** A validation failure that is reported back to Claude verbatim. */
export class SceneError extends Error {}

const ID_PATTERN = /^[A-Za-z][\w-]{0,63}$/;

export type NodeInput = {
  id: string;
  label: string;
  description?: string;
  file?: string;
  line?: number;
  group?: string;
  icon?: string;
  shape?: NodeShape;
  tone?: Tone;
};

export type EdgeInput = {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed";
  tone?: Tone;
  bidirectional?: boolean;
};

export type PartInput = {
  id: string;
  type: string;
  label?: string;
  props?: Record<string, string>;
  group?: string;
};

export type WireInput = { from: string; to: string; color?: WireColor; label?: string };

export type LabelInput = { target: string; text: string; anchor?: string };

export type StepInput = { title: string; text?: string; highlight: string[] };

export type GroupInput = { id: string; label: string; parent?: string; description?: string };

/**
 * Accumulates a scene from tool calls and enforces its invariants: unique
 * ids, valid references and known parts and pins. Positions never enter here.
 */
export class SceneBuilder {
  scene: Scene = emptyScene();

  constructor(private readonly parts: PartIndex) {}

  reset(meta: { title?: string; subtitle?: string; direction?: Direction } = {}): void {
    this.scene = emptyScene();
    this.setMeta(meta);
  }

  setMeta(meta: { title?: string; subtitle?: string; direction?: Direction }): void {
    if (meta.title !== undefined) this.scene.title = meta.title;
    if (meta.subtitle !== undefined) this.scene.subtitle = meta.subtitle;
    if (meta.direction !== undefined) this.scene.direction = meta.direction;
  }

  addGroup(input: GroupInput): void {
    this.claimId(input.id);
    if (input.parent !== undefined) this.requireGroup(input.parent);
    this.scene.groups.push({ ...input });
  }

  addNode(input: NodeInput): void {
    this.claimId(input.id);
    if (input.group !== undefined) this.requireGroup(input.group);
    if (input.icon !== undefined && !resolveIcon(input.icon)) {
      throw new SceneError(
        `Unknown icon "${input.icon}". Use a Lucide name like "lucide:database" or a Simple Icons name like "simple-icons:react".`,
      );
    }
    if (input.line !== undefined && input.file === undefined) {
      throw new SceneError(`Node "${input.id}" has a line but no file.`);
    }
    this.scene.nodes.push(stripUndefined({ ...input }));
  }

  addEdge(input: EdgeInput): string {
    for (const end of [input.from, input.to]) {
      if (!this.isConnectable(end)) {
        throw new SceneError(
          `There is no node, group, part or image "${end}". Add it before connecting it.`,
        );
      }
    }
    const id = this.uniqueId(`${input.from}->${input.to}`);
    this.scene.edges.push(stripUndefined({ id, ...input }));
    return id;
  }

  addPart(input: PartInput): void {
    this.claimId(input.id);
    if (!this.parts.has(input.type)) {
      const suggestions = this.parts.search(input.type, 5).map((p) => p.type);
      throw new SceneError(
        `Unknown part type "${input.type}".` +
          (suggestions.length
            ? ` Did you mean: ${suggestions.join(", ")}?`
            : " Use search_parts to find one."),
      );
    }
    if (input.group !== undefined) this.requireGroup(input.group);
    this.scene.parts.push(stripUndefined({ ...input }));
  }

  connect(input: WireInput): string {
    const from = this.resolvePinRef(input.from);
    const to = this.resolvePinRef(input.to);
    const id = this.uniqueId(`${from.part}.${from.pin}->${to.part}.${to.pin}`);
    this.scene.wires.push(stripUndefined({ id, from, to, color: input.color, label: input.label }));
    return id;
  }

  addLabel(input: LabelInput): string {
    const part = this.scene.parts.find((p) => p.id === input.target);
    const image = this.scene.images.find((i) => i.id === input.target);
    const node = this.scene.nodes.find((n) => n.id === input.target);
    if (!part && !image && !node) {
      throw new SceneError(`There is no part, image or node "${input.target}" to label.`);
    }
    let anchor = input.anchor;
    if (anchor !== undefined && part) {
      const pin = this.parts.resolvePin(part.type, anchor);
      if (!pin) throw new SceneError(this.unknownPinMessage(part.id, part.type, anchor));
      anchor = pin.name;
    }
    if (anchor !== undefined && image && !image.regions[anchor]) {
      const known = Object.keys(image.regions);
      throw new SceneError(
        `Image "${image.id}" has no region "${anchor}".` +
          (known.length ? ` Known regions: ${known.join(", ")}.` : " Run locate first."),
      );
    }
    if (anchor !== undefined && node) {
      throw new SceneError("Node labels cannot have an anchor.");
    }
    const id = this.uniqueId(`label-${input.target}${anchor ? `-${anchor}` : ""}`);
    this.scene.labels.push(stripUndefined({ id, target: input.target, anchor, text: input.text }));
    return id;
  }

  addImage(image: SceneImage): void {
    this.claimId(image.id);
    this.scene.images.push(image);
  }

  updateImageRegions(id: string, regions: SceneImage["regions"]): boolean {
    const image = this.scene.images.find((i) => i.id === id);
    if (!image) return false;
    Object.assign(image.regions, regions);
    return true;
  }

  addStep(input: StepInput): number {
    const known = this.allIds();
    const missing = input.highlight.filter((id) => !known.has(id));
    if (missing.length) {
      throw new SceneError(
        `Cannot highlight unknown ids: ${missing.join(", ")}. Edge ids look like "from->to".`,
      );
    }
    this.scene.steps.push(stripUndefined({ ...input }));
    return this.scene.steps.length;
  }

  /** Ids of every addressable element, including generated edge ids. */
  allIds(): Set<string> {
    const s = this.scene;
    return new Set([
      ...s.nodes.map((x) => x.id),
      ...s.groups.map((x) => x.id),
      ...s.parts.map((x) => x.id),
      ...s.images.map((x) => x.id),
      ...s.edges.map((x) => x.id),
      ...s.wires.map((x) => x.id),
      ...s.labels.map((x) => x.id),
    ]);
  }

  isEmpty(): boolean {
    const s = this.scene;
    return s.nodes.length + s.parts.length + s.images.length + s.groups.length === 0;
  }

  private resolvePinRef(ref: string): PinRef {
    const dot = ref.indexOf(".");
    if (dot <= 0) {
      throw new SceneError(`"${ref}" is not a pin reference. Use "partId.pin", e.g. "uno.D13".`);
    }
    const partId = ref.slice(0, dot);
    const pinName = ref.slice(dot + 1);
    const part = this.scene.parts.find((p) => p.id === partId);
    if (!part)
      throw new SceneError(`There is no part "${partId}". Place it with place_part first.`);
    const pin = this.parts.resolvePin(part.type, pinName);
    if (!pin) throw new SceneError(this.unknownPinMessage(partId, part.type, pinName));
    return { part: partId, pin: pin.name };
  }

  private unknownPinMessage(partId: string, type: string, pin: string): string {
    const names = this.parts.pins(type).map((p) => p.name);
    return `Part "${partId}" (${type}) has no pin "${pin}". Pins: ${names.join(", ")}.`;
  }

  private isConnectable(id: string): boolean {
    const s = this.scene;
    return [s.nodes, s.groups, s.parts, s.images].some((list) => list.some((x) => x.id === id));
  }

  private requireGroup(id: string): void {
    if (!this.scene.groups.some((g) => g.id === id)) {
      throw new SceneError(`There is no group "${id}". Add it with add_group first.`);
    }
  }

  private claimId(id: string): void {
    if (!ID_PATTERN.test(id)) {
      throw new SceneError(
        `Invalid id "${id}". Use letters, digits, "_" or "-", starting with a letter (no dots).`,
      );
    }
    if (this.allIds().has(id)) throw new SceneError(`The id "${id}" is already used.`);
  }

  private uniqueId(base: string): string {
    const ids = this.allIds();
    if (!ids.has(base)) return base;
    let n = 2;
    while (ids.has(`${base}#${n}`)) n++;
    return `${base}#${n}`;
  }
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
