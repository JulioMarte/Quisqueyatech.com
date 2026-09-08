import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { SettingsService } from "../../src/server/services/settings";
import { RuntimeWorker } from "../../src/server/workers/runtime";

const NOW = 1_800_000_000_000;

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-runtime-worker-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  return {
    database,
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("one runtime tick handles due delivery, scheduled publication and retention", async () => {
  const f = fixture();
  try {
    new SettingsService(f.database).save({
      config: { webhookEnabled: true, webhookUrl: "https://hooks.example.com/events" },
      secrets: [{ key: "webhookSecret", ciphertext: "v1.mock", lastFour: "mock", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW - 100,
    });
    f.database.prepare(`
      INSERT INTO webhookDeliveries(id,eventId,type,payload,status,attempts,nextAttemptAt,createdAt)
      VALUES ('delivery','event','booking.created','{"eventId":"event"}','pending',0,?,?)
    `).run(NOW, NOW - 100);
    f.database.prepare(`
      INSERT INTO posts(id,locale,slug,title,excerpt,body,status,publishedAt,authorEmail,createdAt,updatedAt)
      VALUES ('post','es','scheduled','Scheduled','Excerpt','Body','scheduled',?,'admin@example.com',?,?)
    `).run(NOW, NOW - 100, NOW - 100);
    f.database.prepare(`
      INSERT INTO apiIdempotency(id,scope,key,value,expiresAt,createdAt)
      VALUES ('expired','scope','key','{}',?,?)
    `).run(NOW - 1, NOW - 100);

    const worker = new RuntimeWorker(
      f.database,
      async () => ({ success: true, statusCode: 204, durationMs: 5 }),
      () => NOW,
      { publishMs: 60_000, retentionMs: 60_000, securityCleanupMs: 60_000 },
    );
    const result = await worker.tick();
    assert.equal(result.delivered, 1);
    assert.equal(result.published, 1);
    assert.equal(result.retention?.deletedIdempotency, 1);
    assert.equal(result.securityCleaned, true);
    assert.equal((f.database.prepare("SELECT status FROM webhookDeliveries WHERE id='delivery'").get() as { status: string }).status, "delivered");
    assert.equal((f.database.prepare("SELECT status FROM posts WHERE id='post'").get() as { status: string }).status, "published");
  } finally { f.close(); }
});

test("maintenance cadence prevents repeated heavy cleanup on every webhook poll", async () => {
  const f = fixture();
  try {
    let now = NOW;
    const worker = new RuntimeWorker(
      f.database,
      async () => ({ success: true, statusCode: 204, durationMs: 1 }),
      () => now,
      { publishMs: 60_000, retentionMs: 3_600_000, securityCleanupMs: 3_600_000 },
    );
    const first = await worker.tick();
    assert.notEqual(first.retention, null);
    now += 5_000;
    const second = await worker.tick();
    assert.equal(second.published, 0);
    assert.equal(second.retention, null);
    assert.equal(second.securityCleaned, false);
  } finally { f.close(); }
});
