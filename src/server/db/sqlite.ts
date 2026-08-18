import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";

export interface SQLiteOptions {
  path?: string;
  readonly?: boolean;
  migrate?: boolean;
}

const DEFAULT_DATABASE_PATH = resolve(process.cwd(), "data/quisqueyatech.sqlite");
const MIGRATIONS_PATH = resolve(process.cwd(), "db/migrations");

export function databasePath() {
  return resolve(process.env.SQLITE_DATABASE_PATH || DEFAULT_DATABASE_PATH);
}

export class SQLiteDatabase {
  readonly db: DatabaseSync;
  readonly path: string;

  constructor(options: SQLiteOptions = {}) {
    this.path = resolve(options.path || databasePath());
    if (!options.readonly) mkdirSync(dirname(this.path), { recursive: true });

    this.db = new DatabaseSync(this.path, {
      readOnly: options.readonly ?? false,
      enableForeignKeyConstraints: true,
      timeout: 5_000,
    });

    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
    if (!options.readonly) {
      this.db.exec("PRAGMA journal_mode = WAL");
      this.db.exec("PRAGMA synchronous = NORMAL");
    }

    if (options.migrate ?? !options.readonly) this.migrate();
  }

  prepare(sql: string): StatementSync {
    return this.db.prepare(sql);
  }

  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schemaMigrations (
        version TEXT PRIMARY KEY,
        appliedAt INTEGER NOT NULL
      ) STRICT
    `);

    const applied = new Set(
      this.db.prepare("SELECT version FROM schemaMigrations").all().map((row) => String(row.version)),
    );

    const files = readdirSync(MIGRATIONS_PATH)
      .filter((name) => name.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(resolve(MIGRATIONS_PATH, file), "utf8");
      this.transaction(() => {
        this.db.exec(sql);
        this.db
          .prepare("INSERT INTO schemaMigrations(version, appliedAt) VALUES (?, ?)")
          .run(file, Date.now());
      });
    }
  }

  close() {
    this.db.close();
  }
}

let singleton: SQLiteDatabase | undefined;

export function getDatabase() {
  singleton ??= new SQLiteDatabase();
  return singleton;
}
