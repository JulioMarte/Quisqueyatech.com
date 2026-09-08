import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

function migratedDatabase() {
  const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
  db.exec('PRAGMA foreign_keys = ON');
  const migrations = readdirSync(resolve('db/migrations')).filter((file) => file.endsWith('.sql')).sort();
  for (const migration of migrations) db.exec(readFileSync(resolve('db/migrations', migration), 'utf8'));
  return db;
}

test('Convex tables are represented in SQLite', () => {
  const db = migratedDatabase();
  const names = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all().map((row) => row.name));
  for (const table of [
    'leads', 'assessments', 'assessmentSessions', 'assessmentTelemetry', 'assessmentEvents',
    'assessmentRateLimits', 'bookings', 'availabilityRules', 'availabilityExceptions',
    'bookingAudit', 'secretSettings', 'webhookDeliveries', 'webhookDeliveryAttempts',
    'configurationAudit', 'webhookEvents', 'voiceMetrics', 'posts', 'categories', 'media',
    'postRevisions', 'aiRuns', 'apiIdempotency', 'funnelEvents', 'systemSettings',
    'adminInstallation', 'adminRecoveryCodes', 'contentAgents', 'contentAgentRateLimits',
    'authSecurityRateLimits', 'storageObjects', 'postsSearch', 'bookingsSearch',
  ]) assert.ok(names.has(table), `missing table ${table}`);
  db.close();
});

test('locale and relation invariants are enforced', () => {
  const db = migratedDatabase();
  assert.throws(() => db.prepare(`
    INSERT INTO leads(id,firstName,lastName,country,locale,email,phone,source,status,processingConsentAt,leadExpiresAt,createdAt,updatedAt)
    VALUES ('lead-1','A','B','DO','fr','a@example.com','1','test','new',1,2,1,1)
  `).run(), /CHECK constraint failed/);

  assert.throws(() => db.prepare(`
    INSERT INTO assessments(id,assessmentId,leadId,mode,status,recordingConsentAt,audioExpiresAt,transcriptExpiresAt,createdAt)
    VALUES ('assessment-1','a-1','missing','voice','new',1,2,2,1)
  `).run(), /FOREIGN KEY constraint failed/);
  db.close();
});

test('post and booking FTS indexes replace Convex search indexes', () => {
  const db = migratedDatabase();
  db.prepare(`INSERT INTO categories(id,locale,name,slug) VALUES ('cat-1','es','Automatización','automatizacion')`).run();
  db.prepare(`
    INSERT INTO posts(id,locale,slug,title,excerpt,categoryId,body,status,publishedAt,authorEmail,createdAt,updatedAt)
    VALUES ('post-1','es','automatizacion-clinicas','Automatización para clínicas','Resumen','cat-1','Contenido','published',1,'admin@example.com',1,1)
  `).run();
  const post = db.prepare(`SELECT p.id FROM postsSearch JOIN posts p ON p.rowid=postsSearch.rowid WHERE postsSearch MATCH ?`).get('Automatización');
  assert.equal(post.id, 'post-1');

  db.prepare(`
    INSERT INTO leads(id,firstName,lastName,country,locale,email,phone,source,status,processingConsentAt,leadExpiresAt,createdAt,updatedAt)
    VALUES ('lead-1','A','B','DO','es','a@example.com','1','test','new',1,2,1,1)
  `).run();
  db.prepare(`
    INSERT INTO bookings(id,bookingId,leadId,searchText,start,timezone,channel,status,createdAt,updatedAt)
    VALUES ('booking-1','b-1','lead-1','Julio dental appointment','2026-08-20T10:00','America/Santo_Domingo','web','confirmed',1,1)
  `).run();
  const booking = db.prepare(`SELECT b.id FROM bookingsSearch JOIN bookings b ON b.rowid=bookingsSearch.rowid WHERE bookingsSearch MATCH ?`).get('dental');
  assert.equal(booking.id, 'booking-1');
  db.close();
});
