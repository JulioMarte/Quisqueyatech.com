import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const snapshotRoot = process.argv[2] ? resolve(process.argv[2]) : null;
if (!snapshotRoot) {
  console.error('Usage: npm run db:reconcile:convex -- <extracted-convex-snapshot-directory>');
  process.exit(2);
}
if (snapshotRoot.endsWith('.zip')) {
  console.error('Extract the Convex snapshot ZIP first.');
  process.exit(2);
}
if (!existsSync(snapshotRoot)) throw new Error(`Snapshot directory does not exist: ${snapshotRoot}`);

const dbPath = resolve(process.env.SQLITE_DATABASE_PATH || 'data/quisqueyatech.sqlite');
const publicUploads = resolve(process.env.SQLITE_MEDIA_OUTPUT_PATH || 'public/uploads');
if (!existsSync(dbPath)) throw new Error(`SQLite database does not exist at ${dbPath}`);

const db = new DatabaseSync(dbPath, { readOnly: true, enableForeignKeyConstraints: true, timeout: 5000 });
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

const quote = (identifier) => `"${String(identifier).replaceAll('"', '""')}"`;
const tableNames = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => String(row.name)),
);

const result = {
  database: dbPath,
  snapshot: snapshotRoot,
  integrity: 'unknown',
  foreignKeyViolations: 0,
  tables: [],
  storage: { expected: 0, present: 0, missing: [] },
  fts: [],
  errors: [],
};

const integrity = db.prepare('PRAGMA integrity_check').all().map((row) => String(row.integrity_check ?? row['integrity_check']));
result.integrity = integrity.join('; ');
if (integrity.length !== 1 || integrity[0] !== 'ok') result.errors.push(`SQLite integrity_check failed: ${result.integrity}`);

const fkViolations = db.prepare('PRAGMA foreign_key_check').all();
result.foreignKeyViolations = fkViolations.length;
if (fkViolations.length) result.errors.push(`${fkViolations.length} foreign-key violation(s)`);

const tableDirectories = readdirSync(snapshotRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
for (const entry of tableDirectories) {
  const convexTable = entry.name;
  const sqliteTable = convexTable === '_storage' ? 'storageObjects' : convexTable;
  const documentsPath = resolve(snapshotRoot, convexTable, 'documents.jsonl');
  if (!existsSync(documentsPath)) continue;

  const expected = readFileSync(documentsPath, 'utf8').split(/\r?\n/).filter(Boolean).length;
  if (!tableNames.has(sqliteTable)) {
    result.tables.push({ convexTable, sqliteTable, expected, actual: null, status: 'unmapped' });
    result.errors.push(`${convexTable}: no SQLite table ${sqliteTable}`);
    continue;
  }

  const actual = Number(db.prepare(`SELECT count(*) AS count FROM ${quote(sqliteTable)}`).get().count);
  const status = expected === actual ? 'ok' : 'mismatch';
  result.tables.push({ convexTable, sqliteTable, expected, actual, status });
  if (status !== 'ok') result.errors.push(`${convexTable}: snapshot=${expected}, sqlite=${actual}`);

  if (convexTable === '_storage') {
    result.storage.expected = expected;
    const lines = readFileSync(documentsPath, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const document = JSON.parse(line);
      const id = String(document._id ?? document.id ?? '');
      if (!id) {
        result.storage.missing.push('<missing-id>');
        continue;
      }
      const row = db.prepare('SELECT path FROM storageObjects WHERE id=? LIMIT 1').get(id);
      const path = row?.path ? String(row.path) : '';
      if (!path.startsWith('/uploads/')) {
        result.storage.missing.push(id);
        continue;
      }
      const diskPath = resolve(publicUploads, path.slice('/uploads/'.length));
      if (!existsSync(diskPath)) result.storage.missing.push(id);
      else result.storage.present += 1;
    }
    if (result.storage.missing.length) {
      result.errors.push(`${result.storage.missing.length} storage object(s) missing imported files`);
    }
  }
}

for (const [ftsTable, sourceTable] of [['postsSearch', 'posts'], ['bookingsSearch', 'bookings']]) {
  if (!tableNames.has(ftsTable) || !tableNames.has(sourceTable)) continue;
  const source = Number(db.prepare(`SELECT count(*) AS count FROM ${quote(sourceTable)}`).get().count);
  const indexed = Number(db.prepare(`SELECT count(*) AS count FROM ${quote(ftsTable)}`).get().count);
  const status = source === indexed ? 'ok' : 'mismatch';
  result.fts.push({ ftsTable, sourceTable, source, indexed, status });
  if (status !== 'ok') result.errors.push(`${ftsTable}: source=${source}, indexed=${indexed}`);
}

db.close();

console.log(JSON.stringify(result, null, 2));
if (result.errors.length) process.exit(1);
