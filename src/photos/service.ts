import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LocalDatabase } from "../storage/database.js";
import { all, get, run, transaction } from "../storage/sqlite.js";
import type { Region, SceneImage } from "../scene/types.js";
import { SceneError } from "../scene/builder.js";
import { Grounder, type LocateResult, type ProgressEvent } from "./grounding.js";
import { MODELS, isModelTier, unavailableReason, type ModelTier } from "./models.js";
import { USER_AGENT, attributionOf, searchImages, type ImageCandidate } from "./search.js";

const MAX_IMAGE_WIDTH = 1280;

export type ModelState =
  | { state: "none" }
  | { state: "downloading"; tier: ModelTier; progress: number }
  | { state: "ready"; tier: ModelTier }
  | { state: "error"; tier: ModelTier; message: string };

/**
 * Photo search, caching and grounding. Search results and found regions are
 * kept in SQLite so the same photo is never searched or analysed twice.
 */
export class PhotoService {
  private grounder: Grounder | undefined;
  private download: ModelState | undefined;

  constructor(
    private readonly db: LocalDatabase,
    private readonly dataDir: string,
  ) {}

  async find(query: string, minWidth?: number): Promise<ImageCandidate[]> {
    const candidates = await searchImages(query, { minWidth, limit: 6 });
    const now = Date.now();
    transaction(this.db.db, () => {
      for (const c of candidates) {
        run(
          this.db.db,
          `INSERT OR REPLACE INTO images
             (id, provider, query, title, author, license, license_url, source_url, file_url, width, height, description, found_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id,
            c.provider,
            query,
            c.title,
            c.author,
            c.license,
            c.licenseUrl ?? null,
            c.sourceUrl,
            c.fileUrl,
            c.width,
            c.height,
            c.description ?? null,
            now,
          ],
        );
      }
    });
    this.db.save();
    return candidates;
  }

  candidate(id: string): ImageCandidate {
    const row = get(this.db.db, "SELECT * FROM images WHERE id = ?", [id]);
    if (!row) throw new SceneError(`Unknown image "${id}". Use an id returned by find_image.`);
    return {
      id: String(row.id),
      provider: row.provider as ImageCandidate["provider"],
      title: String(row.title),
      author: String(row.author),
      license: String(row.license),
      licenseUrl: row.license_url ? String(row.license_url) : undefined,
      sourceUrl: String(row.source_url),
      fileUrl: String(row.file_url),
      thumbUrl: String(row.file_url),
      width: Number(row.width),
      height: Number(row.height),
      description: row.description ? String(row.description) : undefined,
    };
  }

  /** Downloads (once) a JPEG of at most 1280 px width and returns its path. */
  async localFile(id: string): Promise<{ path: string; width: number; height: number }> {
    const dir = join(this.dataDir, "images");
    const path = join(dir, `${id}.jpg`);
    const sharp = (await import("sharp")).default;
    if (!existsSync(path)) {
      const c = this.candidate(id);
      const response = await fetch(c.fileUrl, { headers: { "User-Agent": USER_AGENT } });
      if (!response.ok) throw new Error(`Could not download the photo (${response.status}).`);
      const input = Buffer.from(await response.arrayBuffer());
      mkdirSync(dir, { recursive: true });
      const output = await sharp(input)
        .rotate()
        .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 85 })
        .toBuffer();
      writeFileSync(path, output);
    }
    const meta = await sharp(path).metadata();
    return { path, width: meta.width ?? 0, height: meta.height ?? 0 };
  }

  async sceneImage(id: string, caption?: string): Promise<SceneImage> {
    const file = await this.localFile(id);
    return {
      id,
      src: `data:image/jpeg;base64,${readFileSync(file.path).toString("base64")}`,
      width: file.width,
      height: file.height,
      ...(caption ? { caption } : {}),
      attribution: attributionOf(this.candidate(id)),
      regions: this.regions(id),
    };
  }

  regions(id: string): Record<string, Region> {
    const tier = this.chosenTier();
    const rows = all(
      this.db.db,
      // Prefer results of the current model, fall back to any earlier one.
      `SELECT name, x, y, width, height FROM image_regions WHERE image_id = ?
        ORDER BY CASE WHEN model = ? THEN 0 ELSE 1 END DESC`,
      [id, tier ?? ""],
    );
    const regions: Record<string, Region> = {};
    for (const r of rows) {
      regions[String(r.name)] = {
        x: Number(r.x),
        y: Number(r.y),
        width: Number(r.width),
        height: Number(r.height),
      };
    }
    return regions;
  }

  async locate(id: string, queries: string[]): Promise<LocateResult> {
    const grounder = await this.readyGrounder();
    const file = await this.localFile(id);
    const result = await grounder.locate(file.path, queries);
    transaction(this.db.db, () => {
      for (const f of result.found) {
        run(
          this.db.db,
          `INSERT OR REPLACE INTO image_regions (image_id, name, model, method, x, y, width, height)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            f.name,
            grounder.tier,
            f.method,
            f.region.x,
            f.region.y,
            f.region.width,
            f.region.height,
          ],
        );
      }
    });
    this.db.save();
    return result;
  }

  /** JPEG preview with numbered boxes, so Claude can check what was found. */
  async annotate(id: string, found: { name: string; region: Region }[]): Promise<string> {
    const sharp = (await import("sharp")).default;
    const file = await this.localFile(id);
    const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    const boxes = found
      .map(({ name, region: r }) => {
        const labelY = r.y > 26 ? r.y - 8 : r.y + r.height + 22;
        return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="#ff2d2d" stroke-width="4"/>
          <text x="${r.x}" y="${labelY}" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ff2d2d" stroke="#fff" stroke-width="4" paint-order="stroke">${escape(name)}</text>`;
      })
      .join("");
    const overlay = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${file.width}" height="${file.height}">${boxes}</svg>`,
    );
    // sharp resizes before compositing, so draw at full size in a first pass.
    const drawn = await sharp(file.path)
      .composite([{ input: overlay }])
      .toBuffer();
    const preview = await sharp(drawn).resize({ width: 768 }).jpeg({ quality: 70 }).toBuffer();
    return preview.toString("base64");
  }

  chosenTier(): ModelTier | undefined {
    const tier = this.db.getSetting("photo.model");
    if (!isModelTier(tier)) return undefined;
    // A larger model chosen elsewhere cannot run here; fall back to Small.
    return unavailableReason(tier) ? "small" : tier;
  }

  modelState(): ModelState {
    if (this.download?.state === "downloading" || this.download?.state === "error")
      return this.download;
    const tier = this.chosenTier();
    if (tier && this.db.getSetting(`photo.model.${tier}.ready`) === "true")
      return { state: "ready", tier };
    return { state: "none" };
  }

  /** Starts a background download; progress is polled through modelState(). */
  startDownload(tier: ModelTier): ModelState {
    if (this.download?.state === "downloading") return this.download;
    const reason = unavailableReason(tier);
    if (reason) return { state: "error", tier, message: reason };
    const files = new Map<string, { loaded: number; total: number }>();
    this.download = { state: "downloading", tier, progress: 0 };
    const onProgress = (event: ProgressEvent) => {
      if (event.status !== "progress" || !event.file || !event.total) return;
      files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      if (this.download?.state === "downloading") {
        // Totals grow as new files start; never let the bar move backwards.
        this.download.progress = Math.max(this.download.progress, Math.min(0.99, loaded / total));
      }
    };
    Grounder.load(tier, this.dataDir, onProgress)
      .then((grounder) => {
        this.grounder = grounder;
        this.db.setSetting(`photo.model.${tier}.ready`, "true");
        this.db.setSetting("photo.model", tier);
        this.download = { state: "ready", tier };
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.download = { state: "error", tier, message };
      });
    return this.download;
  }

  private async readyGrounder(): Promise<Grounder> {
    const state = this.modelState();
    if (state.state === "downloading") {
      throw new SceneError(
        `The ${MODELS[state.tier].title.toLowerCase()} model is still downloading (${Math.round(state.progress * 100)} %). Try again in a moment.`,
      );
    }
    if (state.state !== "ready") {
      throw new SceneError(
        "No photo-labeling model is installed yet. Call choose_model so the user can pick and download one, then call locate again.",
      );
    }
    if (this.grounder?.tier !== state.tier) {
      this.grounder = await Grounder.load(state.tier, this.dataDir);
    }
    return this.grounder;
  }
}
