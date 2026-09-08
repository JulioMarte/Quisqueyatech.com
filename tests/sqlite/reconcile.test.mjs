import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

function run(command, args, env) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

test('reconciliation passes on an exact import and fails after SQLite drift', () => {
  const root = mkdtempSync(join(tmpdir(), 'quisqueya-reconcile-'));
  const databasePath = join(root, 'test.sqlite');
  const snapshot = join(root, 'snapshot');
  const leads = join(snapshot, 'leads');
  mkdirSync(leads, { recursive: true });
  writeFileSync(join(leads, 'documents.jsonl'), `${JSON.stringify({
    _id: 'lead-1',
    _creationTime: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    country: 'DO',
    locale: 'es',
    email: 'ada@example.com',
    phone: '8095550101',
    source: 'test',
    status: 'new',
    processingConsentAt: 1,
    leadExpiresAt: 9999999999999,
    createdAt: 1,
    updatedAt: 1,
  })}\n`);

  try {
    const migrated = run(process.execPath, ['scripts/sqlite-migrate.mjs'], { SQLITE_DATABASE_PATH: databasePath });
    assert.equal(migrated.status, 0, migrated.stderr || migrated.stdout);

    const imported = run(process.execPath, ['scripts/import-convex-snapshot.mjs', snapshot], { SQLITE_DATABASE_PATH: databasePath });
    assert.equal(imported.status, 0, imported.stderr || imported.stdout);

    const exact = run(process.execPath, ['scripts/reconcile-convex-snapshot.mjs', snapshot], { SQLITE_DATABASE_PATH: databasePath });
    assert.equal(exact.status, 0, exact.stderr || exact.stdout);
    const report = JSON.parse(exact.stdout);
    assert.equal(report.integrity, 'ok');
    assert.equal(report.foreignKeyViolations, 0);
    assert.deepEqual(report.errors, []);
    assert.equal(report.tables.find((item) => item.convexTable === 'leads')?.status, 'ok');

    const db = new DatabaseSync(databasePath);
    db.prepare(`
      INSERT INTO leads(id,firstName,lastName,country,locale,email,phone,source,status,processingConsentAt,leadExpiresAt,createdAt,updatedAt)
      VALUES ('lead-drift','Grace','Hopper','US','en','grace@example.com','1','test','new',1,9999999999999,1,1)
    `).run();
    db.close();

    const drift = run(process.execPath, ['scripts/reconcile-convex-snapshot.mjs', snapshot], { SQLITE_DATABASE_PATH: databasePath });
    assert.equal(drift.status, 1);
    const driftReport = JSON.parse(drift.stdout);
    assert.ok(driftReport.errors.some((message) => message.includes('leads: snapshot=1, sqlite=2')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
