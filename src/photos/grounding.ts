import type { Region } from "../scene/types.js";
import { MODELS, type ModelTier } from "./models.js";

export type LocateMethod = "text" | "grounding" | "detection";

export type LocatedRegion = { name: string; region: Region; method: LocateMethod };

export type LocateResult = { found: LocatedRegion[]; missing: string[] };

export type ProgressEvent = { file?: string; loaded?: number; total?: number; status: string };

type Box = [number, number, number, number];

// transformers.js is loaded lazily: the drawing core must work without it.
type Transformers = typeof import("@huggingface/transformers");
type Florence = {
  model: { generate(inputs: Record<string, unknown>): Promise<unknown> };
  processor: {
    construct_prompts(text: string): string;
    batch_decode(ids: unknown, options: { skip_special_tokens: boolean }): string[];
    post_process_generation(
      text: string,
      task: string,
      size: [number, number],
    ): Record<string, unknown>;
    (image: unknown, prompt: string): Promise<Record<string, unknown>>;
  };
  RawImage: Transformers["RawImage"];
};

/** Boxes covering more than this share of the image mean "not found". */
const MAX_AREA_SHARE = 0.45;

/**
 * Finds named regions in a photo with Florence-2, in order of reliability:
 * printed text (OCR), then phrase grounding, then open-vocabulary detection.
 * Degenerate answers (the whole object or the whole frame) are rejected so a
 * wrong label is never drawn.
 */
export class Grounder {
  private constructor(
    private readonly florence: Florence,
    readonly tier: ModelTier,
  ) {}

  static async load(
    tier: ModelTier,
    cacheDir: string,
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<Grounder> {
    const tf = await import("@huggingface/transformers");
    tf.env.cacheDir = cacheDir;
    const info = MODELS[tier];
    const progress_callback = (event: unknown) => onProgress?.(event as ProgressEvent);
    const model = await tf.Florence2ForConditionalGeneration.from_pretrained(info.repo, {
      dtype: info.dtype,
      progress_callback,
    });
    const processor = await tf.AutoProcessor.from_pretrained(info.repo, { progress_callback });
    return new Grounder(
      {
        model: model as unknown as Florence["model"],
        processor: processor as unknown as Florence["processor"],
        RawImage: tf.RawImage,
      },
      tier,
    );
  }

  async locate(imagePath: string, queries: string[]): Promise<LocateResult> {
    const image = await this.florence.RawImage.read(imagePath);
    const size: [number, number] = [image.width, image.height];
    const tooBig = (b: Box) =>
      ((b[2] - b[0]) * (b[3] - b[1])) / (size[0] * size[1]) > MAX_AREA_SHARE;

    const ocr = await this.ocr(image, size);
    const found: LocatedRegion[] = [];
    const missing: string[] = [];
    for (const name of queries) {
      const text = matchText(name, ocr);
      if (text) {
        found.push({ name, region: toRegion(text), method: "text" });
        continue;
      }
      const grounded = (await this.ground(image, size, name)).find((b) => !tooBig(b));
      if (grounded) {
        found.push({ name, region: toRegion(grounded), method: "grounding" });
        continue;
      }
      const detected = (await this.detect(image, size, name)).find((b) => !tooBig(b));
      if (detected) {
        found.push({ name, region: toRegion(detected), method: "detection" });
        continue;
      }
      missing.push(name);
    }
    return { found, missing };
  }

  private async run(image: unknown, task: string, text = ""): Promise<string> {
    const { model, processor } = this.florence;
    const inputs = await processor(image, processor.construct_prompts(task + text));
    const ids = await model.generate({ ...inputs, max_new_tokens: 256 });
    return processor.batch_decode(ids, { skip_special_tokens: false })[0] ?? "";
  }

  private async ocr(image: unknown, size: [number, number]): Promise<{ text: string; box: Box }[]> {
    const task = "<OCR_WITH_REGION>";
    const raw = await this.run(image, task);
    const result = this.florence.processor.post_process_generation(raw, task, size)[task] as
      { labels: string[]; quad_boxes: number[][] } | undefined;
    if (!result) return [];
    return result.labels.map((text, i) => {
      const q = result.quad_boxes[i] ?? [];
      const xs = [q[0], q[2], q[4], q[6]].map(Number);
      const ys = [q[1], q[3], q[5], q[7]].map(Number);
      return {
        text,
        box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as Box,
      };
    });
  }

  private async ground(image: unknown, size: [number, number], phrase: string): Promise<Box[]> {
    const task = "<CAPTION_TO_PHRASE_GROUNDING>";
    const raw = await this.run(image, task, phrase);
    const result = this.florence.processor.post_process_generation(raw, task, size)[task] as
      { bboxes: Box[] } | undefined;
    return result?.bboxes ?? [];
  }

  private async detect(image: unknown, size: [number, number], phrase: string): Promise<Box[]> {
    // transformers.js has no post-processor for this task; parse the tokens.
    const raw = await this.run(image, "<OPEN_VOCABULARY_DETECTION>", phrase);
    if (raw.includes("<poly>")) return [];
    return parseLocBoxes(raw, size);
  }
}

/** Converts Florence location tokens (0–999 bins) into pixel boxes. */
export function parseLocBoxes(text: string, [width, height]: [number, number]): Box[] {
  const values = [...text.matchAll(/<loc_(\d+)>/g)].map((m) => Number(m[1]));
  const boxes: Box[] = [];
  for (let i = 0; i + 3 < values.length; i += 4) {
    const [x1, y1, x2, y2] = values.slice(i, i + 4) as [number, number, number, number];
    boxes.push([
      ((x1 + 0.5) / 1000) * width,
      ((y1 + 0.5) / 1000) * height,
      ((x2 + 0.5) / 1000) * width,
      ((y2 + 0.5) / 1000) * height,
    ]);
  }
  return boxes;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** OCR line whose text equals the query or contains it as a distinct token. */
export function matchText(query: string, lines: { text: string; box: Box }[]): Box | undefined {
  const q = normalize(query);
  if (q.length < 2) return undefined;
  const exact = lines.find((l) => normalize(l.text) === q);
  if (exact) return exact.box;
  const tokenMatch = lines.find((l) =>
    l.text
      .split(/[\s,.;:/()-]+/)
      .map(normalize)
      .includes(q),
  );
  return tokenMatch?.box;
}

function toRegion([x1, y1, x2, y2]: Box): Region {
  const r = (n: number) => Math.round(n * 10) / 10;
  return { x: r(x1), y: r(y1), width: r(x2 - x1), height: r(y2 - y1) };
}
