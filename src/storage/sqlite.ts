import { createRequire } from "node:module";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";

/**
 * SQLite runs as WebAssembly (sql.js) rather than a native addon: the server
 * then loads in any Node runtime, including the one embedded in Claude
 * Desktop, without per-platform binaries.
 */
let sqlPromise: Promise<SqlJsStatic> | undefined;

export function loadSqlite(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
    sqlPromise = initSqlJs({ locateFile: () => wasmPath });
  }
  return sqlPromise;
}

export type Row = Record<string, SqlValue>;

export function all(db: Database, sql: string, params: SqlValue[] = []): Row[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows: Row[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

export function get(db: Database, sql: string, params: SqlValue[] = []): Row | undefined {
  return all(db, sql, params)[0];
}

export function run(db: Database, sql: string, params: SqlValue[] = []): void {
  db.run(sql, params);
}

/** Runs `fn` atomically: either every statement lands or none does. */
export function transaction<T>(db: Database, fn: () => T): T {
  db.run("BEGIN");
  try {
    const result = fn();
    db.run("COMMIT");
    return result;
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}
