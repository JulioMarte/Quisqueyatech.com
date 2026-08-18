import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const snapshotRoot = process.argv[2] ? resolve(process.argv[2]) : null;
if (!snapshotRoot) {
  console.error('Usage: npm run db:import:convex -- <extracted-convex-snapshot-directory>');
  process.exit(2);
}
if (snapshotRoot.endsWith('.zip')) {
  console.error('Extract the Convex snapshot ZIP first. The importer expects <table>/documents.jsonl directories.');
  process.exit(2);
}
if (!existsSync(snapshotRoot)) throw new Error(`Snapshot directory does not exist: ${snapshotRoot}`);

const dbPath = resolve(process.env.SQLITE_DATABASE_PATH || 'data/quisqueyatech.sqlite');
if (!existsSync(dbPath)) {
  throw new Error(`SQLite database does not exist at ${dbPath}. Run npm run db:migrate first.`);
}

const db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: false, timeout: 5000 });
db.exec('PRAGMA busy_timeout = 5000');
db.exec('PRAGMA foreign_keys = OFF');

const quote = (identifier) => `"${String(identifier).replaceAll('"', '""')}"`;
const tableMap = new Map(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => [String(row.name), String(row.name)]),
);

const normalizeValue = (value) => {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return value;
};

const tableDirectories = readdirSync(snapshotRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
let total = 0;

db.exec('BEGIN IMMEDIATE');
try {
  for (const entry of tableDirectories) {
    const convexTable = entry.name;
    const sqliteTable = convexTable === '_storage' ? 'storageObjects' : convexTable;
    if (!tableMap.has(sqliteTable)) {
      console.warn(`skip ${convexTable}: no SQLite table`);
      continue;
    }

    const documentsPath = resolve(snapshotRoot, convexTable, 'documents.jsonl');
    if (!existsSync(documentsPath)) continue;

    const columns = db.prepare(`PRAGMA table_info(${quote(sqliteTable)})`).all().map((row) => String(row.name));
    const allowed = new Set(columns);
    const lines = readFileSync(documentsPath, 'utf8').split(/\r?\n/).filter(Boolean);
    let imported = 0;

    for (const line of lines) {
      const document = JSON.parse(line);
      const mapped = {
        ...document,
        id: document._id ?? document.id,
        creationTime: document._creationTime ?? document.creationTime ?? null,
      };
      delete mapped._id;
      delete mapped._creationTime;

      if (convexTable === '_storage') {
        mapped.path = resolve(snapshotRoot, '_storage', String(mapped.id));
        mapped.metadata = document;
      }

      const names = Object.keys(mapped).filter((name) => allowed.has(name));
      if (!names.includes('id') || !mapped.id) {
        throw new Error(`${convexTable}: document is missing _id`);
      }
      const placeholders = names.map(() => '?').join(',');
      const sql = `INSERT OR REPLACE INTO ${quote(sqliteTable)} (${names.map(quote).join(',')}) VALUES (${placeholders})`;
      db.prepare(sql).run(...names.map((name) => normalizeValue(mapped[name])));
      imported += 1;
      total += 1;
    }
    console.log(`${convexTable} -> ${sqliteTable}: ${imported} document(s)`);
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

db.exec('PRAGMA foreign_keys = ON');
const violations = db.prepare('PRAGMA foreign_key_check').all();
if (violations.length) {
  console.error(violations);
  throw new Error(`Imported data has ${violations.length} foreign-key violation(s)`);
}

// FTS external-content indexes need rebuilding after a bulk import performed with triggers already present.
for (const ftsTable of ['bookingsSearch', 'postsSearch']) {
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(ftsTable);
  if (exists) db.exec(`INSERT INTO ${quote(ftsTable)}(${quote(ftsTable)}) VALUES ('rebuild')`);
}

console.log(`Imported ${total} Convex document(s) into ${dbPath}`);
db.close();
