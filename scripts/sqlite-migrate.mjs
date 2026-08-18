import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = resolve(process.env.SQLITE_DATABASE_PATH || 'data/quisqueyatech.sqlite');
const migrationsPath = resolve('db/migrations');
mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath, {
  enableForeignKeyConstraints: true,
  timeout: 5000,
});

db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS schemaMigrations (
    version TEXT PRIMARY KEY,
    appliedAt INTEGER NOT NULL
  ) STRICT
`);

const applied = new Set(db.prepare('SELECT version FROM schemaMigrations').all().map((row) => String(row.version)));
const migrations = readdirSync(migrationsPath).filter((file) => file.endsWith('.sql')).sort();

for (const migration of migrations) {
  if (applied.has(migration)) continue;
  const sql = readFileSync(resolve(migrationsPath, migration), 'utf8');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(sql);
    db.prepare('INSERT INTO schemaMigrations(version, appliedAt) VALUES (?, ?)').run(migration, Date.now());
    db.exec('COMMIT');
    console.log(`applied ${migration}`);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const violations = db.prepare('PRAGMA foreign_key_check').all();
if (violations.length) {
  console.error(violations);
  throw new Error(`SQLite foreign key check failed with ${violations.length} violation(s)`);
}

console.log(`SQLite ready at ${dbPath}`);
db.close();
