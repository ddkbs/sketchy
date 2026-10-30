import { readFileSync } from "node:fs";
import type { Database } from "sql.js";
import { all, get, loadSqlite, run, transaction } from "../storage/sqlite.js";
import { partMeta } from "./metadata.js";

export type CatalogPin = { name: string; x: number; y: number; signals: string[] };

export type CatalogPart = {
  type: string;
  tag: string;
  width: number;
  height: number;
  svg: string;
  pins: CatalogPin[];
  variants: Record<string, string>;
};

type CatalogFile = { source: string; version: string; license: string; parts: CatalogPart[] };

export type PartSummary = {
  type: string;
  title: string;
  category: string;
  pins: number;
};

export type PartDetail = PartSummary & {
  width: number;
  height: number;
  pinList: CatalogPin[];
  variants: string[];
  source: string;
  license: string;
};

export const CATALOG_URL = new URL("../../build/parts.json", import.meta.url);

/**
 * Searchable index of drawable parts and their anchor points (pins).
 *
 * The schema keeps parts, pins and search terms in separate tables so one
 * part can have many pins and many terms without repeating its data.
 * SVG markup stays in memory; only searchable facts live in SQL.
 */
export class PartIndex {
  private constructor(
    private readonly db: Database,
    private readonly markup: Map<string, CatalogPart>,
    private readonly source: string,
    private readonly license: string,
  ) {}

  static async load(catalogUrl: URL = CATALOG_URL): Promise<PartIndex> {
    const catalog = JSON.parse(readFileSync(catalogUrl, "utf8")) as CatalogFile;
    return PartIndex.fromCatalog(catalog);
  }

  static async fromCatalog(catalog: CatalogFile): Promise<PartIndex> {
    const SQL = await loadSqlite();
    const db = new SQL.Database();
    db.run(`
      CREATE TABLE parts (
        type     TEXT PRIMARY KEY,
        title    TEXT NOT NULL,
        category TEXT NOT NULL,
        width    REAL NOT NULL,
        height   REAL NOT NULL,
        license  TEXT NOT NULL
      );
      CREATE TABLE pins (
        part_type TEXT NOT NULL REFERENCES parts(type),
        ord       INTEGER NOT NULL,
        name      TEXT NOT NULL,
        x         REAL NOT NULL,
        y         REAL NOT NULL,
        signals   TEXT NOT NULL,
        PRIMARY KEY (part_type, name)
      );
      CREATE TABLE part_terms (
        part_type TEXT NOT NULL REFERENCES parts(type),
        term      TEXT NOT NULL
      );
      CREATE INDEX part_terms_term ON part_terms(term);
    `);
    transaction(db, () => {
      for (const part of catalog.parts) {
        const meta = partMeta(part.type);
        run(db, "INSERT INTO parts VALUES (?, ?, ?, ?, ?, ?)", [
          part.type,
          meta.title,
          meta.category,
          part.width,
          part.height,
          catalog.license,
        ]);
        part.pins.forEach((pin, ord) => {
          run(db, "INSERT OR IGNORE INTO pins VALUES (?, ?, ?, ?, ?, ?)", [
            part.type,
            ord,
            pin.name,
            pin.x,
            pin.y,
            JSON.stringify(pin.signals),
          ]);
        });
        const terms = new Set(
          [part.type, meta.title, meta.category, ...meta.keywords]
            .flatMap((t) => [t, ...t.split(/[\s-]+/)])
            .map((t) => t.toLowerCase())
            .filter(Boolean),
        );
        for (const term of terms) {
          run(db, "INSERT INTO part_terms VALUES (?, ?)", [part.type, term]);
        }
      }
    });
    const markup = new Map(catalog.parts.map((p) => [p.type, p]));
    return new PartIndex(db, markup, catalog.source, catalog.license);
  }

  /** Parts whose terms match every word of the query, best matches first. */
  search(query: string, limit = 12): PartSummary[] {
    const words = query
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (words.length === 0) {
      return all(
        this.db,
        `SELECT p.type, p.title, p.category, COUNT(pin.name) AS pins
           FROM parts p LEFT JOIN pins pin ON pin.part_type = p.type
          GROUP BY p.type ORDER BY p.category, p.title LIMIT ?`,
        [limit],
      ).map(toSummary);
    }
    // Score = number of query words that hit a term; exact hits weigh more.
    const scoreParts = words.map(
      () => `(SELECT MAX(CASE WHEN t.term = ? THEN 3 WHEN t.term LIKE ? THEN 1 ELSE 0 END)
                FROM part_terms t WHERE t.part_type = p.type)`,
    );
    const params = words.flatMap((w) => [w, `%${w}%`]);
    return all(
      this.db,
      `SELECT * FROM (
         SELECT p.type, p.title, p.category,
                (SELECT COUNT(*) FROM pins WHERE part_type = p.type) AS pins,
                ${scoreParts.join(" + ")} AS score
           FROM parts p)
        WHERE score > 0 ORDER BY score DESC, title LIMIT ?`,
      [...params, limit],
    ).map(toSummary);
  }

  has(type: string): boolean {
    return this.markup.has(type);
  }

  detail(type: string): PartDetail | undefined {
    const row = get(
      this.db,
      `SELECT p.*, (SELECT COUNT(*) FROM pins WHERE part_type = p.type) AS pins
         FROM parts p WHERE p.type = ?`,
      [type],
    );
    if (!row) return undefined;
    return {
      ...toSummary(row),
      width: Number(row.width),
      height: Number(row.height),
      pinList: this.pins(type),
      variants: Object.keys(this.markup.get(type)?.variants ?? {}),
      source: this.source,
      license: this.license,
    };
  }

  pins(type: string): CatalogPin[] {
    return all(this.db, "SELECT name, x, y, signals FROM pins WHERE part_type = ? ORDER BY ord", [
      type,
    ]).map((r) => ({
      name: String(r.name),
      x: Number(r.x),
      y: Number(r.y),
      signals: JSON.parse(String(r.signals)) as string[],
    }));
  }

  /**
   * Finds a pin by the name Claude is likely to use. Arduino sketches say
   * "D13" or "GND" while the part names them "13" and "GND.1".
   */
  resolvePin(type: string, name: string): CatalogPin | undefined {
    const pins = this.pins(type);
    const wanted = name.trim();
    const lower = wanted.toLowerCase();
    const candidates = [wanted, ...pinAliases(wanted)].map((c) => c.toLowerCase());
    for (const candidate of candidates) {
      const exact = pins.find((p) => p.name.toLowerCase() === candidate);
      if (exact) return exact;
    }
    for (const candidate of candidates) {
      const base = pins.find((p) => p.name.toLowerCase().split(".")[0] === candidate);
      if (base) return base;
    }
    return pins.find((p) => p.signals.some((s) => s.toLowerCase() === lower));
  }

  svg(type: string, props?: Record<string, string>): string {
    const part = this.markup.get(type);
    if (!part) throw new Error(`Unknown part type "${type}".`);
    for (const [key, value] of Object.entries(props ?? {})) {
      const variant = part.variants[`${key}=${value}`];
      if (variant) return variant;
    }
    return part.svg;
  }
}

function pinAliases(name: string): string[] {
  const aliases: string[] = [];
  const digital = /^(?:d|pin|gpio|io)\s*(\d+)$/i.exec(name);
  if (digital) aliases.push(digital[1]!, `D${digital[1]}`);
  if (/^\d+$/.test(name)) aliases.push(`D${name}`);
  const lower = name.toLowerCase();
  if (["+", "anode", "a+", "long leg"].includes(lower)) aliases.push("A");
  if (["-", "cathode", "k", "short leg"].includes(lower)) aliases.push("C");
  if (["5v", "vcc", "+5v"].includes(lower)) aliases.push("5V", "VCC", "VDD", "V+");
  if (["3v3", "3.3v"].includes(lower)) aliases.push("3.3V", "3V3");
  if (["gnd", "ground", "vss"].includes(lower)) aliases.push("GND", "VSS");
  if (["signal", "sig", "data", "out"].includes(lower)) aliases.push("SIG", "OUT", "DAT", "DATA");
  return aliases;
}

function toSummary(row: Record<string, unknown>): PartSummary {
  return {
    type: String(row.type),
    title: String(row.title),
    category: String(row.category),
    pins: Number(row.pins),
  };
}
