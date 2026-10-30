import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Database } from "sql.js";
import { loadSqlite } from "./sqlite.js";

export function defaultDataDir(): string {
  return process.env.SKETCHY_DATA_DIR ?? join(homedir(), ".sketchy");
}

/**
 * Ordered schema migrations. The database remembers how many it has applied
 * (PRAGMA user_version), so new ones run exactly once on existing installs.
 */
const MIGRATIONS = [
  `CREATE TABLE settings (
     key   TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );
   CREATE TABLE images (
     id          TEXT PRIMARY KEY,
     provider    TEXT NOT NULL,
     query       TEXT NOT NULL,
     title       TEXT NOT NULL,
     author      TEXT NOT NULL,
     license     TEXT NOT NULL,
     license_url TEXT,
     source_url  TEXT NOT NULL,
     file_url    TEXT NOT NULL,
     width       INTEGER NOT NULL,
     height      INTEGER NOT NULL,
     description TEXT,
     found_at    INTEGER NOT NULL
   );
   CREATE INDEX images_query ON images(query);
   CREATE TABLE image_regions (
     image_id TEXT NOT NULL REFERENCES images(id),
     name     TEXT NOT NULL,
     model    TEXT NOT NULL,
     method   TEXT NOT NULL,
     x        REAL NOT NULL,
     y        REAL NOT NULL,
     width    REAL NOT NULL,
     height   REAL NOT NULL,
     PRIMARY KEY (image_id, name, model)
   );`,
];

/**
 * The local store: settings, the photo cache and grounding results.
 * sql.js keeps the database in memory; every write is flushed to disk with an
 * atomic rename so a crash never leaves a half-written file.
 */
export class LocalDatabase {
  private constructor(
    readonly db: Database,
    private readonly file: string | undefined,
  ) {}

  static async open(dataDir: string | undefined = defaultDataDir()): Promise<LocalDatabase> {
    const SQL = await loadSqlite();
    let file: string | undefined;
    let db: Database;
    if (dataDir) {
      mkdirSync(dataDir, { recursive: true });
      file = join(dataDir, "sketchy.db");
      db = existsSync(file) ? new SQL.Database(readFileSync(file)) : new SQL.Database();
    } else {
      db = new SQL.Database();
    }
    const store = new LocalDatabase(db, file);
    store.migrate();
    return store;
  }

  private migrate(): void {
    const version = Number(this.db.exec("PRAGMA user_version")[0]?.values[0]?.[0] ?? 0);
    if (version >= MIGRATIONS.length) return;
    this.db.run("BEGIN");
    try {
      for (let v = version; v < MIGRATIONS.length; v++) this.db.run(MIGRATIONS[v]!);
      this.db.run(`PRAGMA user_version = ${MIGRATIONS.length}`);
      this.db.run("COMMIT");
    } catch (error) {
      this.db.run("ROLLBACK");
      throw error;
    }
    this.save();
  }

  save(): void {
    if (!this.file) return;
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, this.db.export());
    renameSync(tmp, this.file);
  }

  getSetting(key: string): string | undefined {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    try {
      stmt.bind([key]);
      return stmt.step() ? String(stmt.get()[0]) : undefined;
    } finally {
      stmt.free();
    }
  }

  setSetting(key: string, value: string): void {
    this.db.run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
    this.save();
  }
}
