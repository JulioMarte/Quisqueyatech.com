import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { WebhookDeliveryService } from "../../src/server/services/webhook-delivery";

const NOW = 1_800_000_000_000;

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-webhook-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  const service = new WebhookDeliveryService(database);
  return {
    database,
    service,
    insert(id = "delivery-1", eventId = "event-1", attempts = 0, status = "pending", nextAttemptAt = NOW) {
      database.prepare(`
        INSERT INTO webhookDeliveries(id,eventId,type,bookingId,payload,status,attempts,nextAttemptAt,createdAt)
        VALUES (?, ?, 'booking.created', NULL, '{}', ?, ?, ?, ?)
      `).run(id, eventId, status, attempts, nextAttemptAt, NOW - 1_000);
    },
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("claimDue leases a delivery and creates one attempt", () => {
  const f = fixture();
  try {
    f.insert();
    const claims = f.service.claimDue(NOW, "lease-1");
    assert.equal(claims.length, 1);
    assert.equal(claims[0]?.attempt, 1);
    assert.equal(claims[0]?.leaseId, "lease-1");
    const delivery = f.database.prepare("SELECT * FROM webhookDeliveries WHERE id='delivery-1'").get() as Record<string, unknown>;
    assert.equal(delivery.status, "processing");
    assert.equal(delivery.attempts, 1);
    assert.equal(delivery.leaseId, "lease-1");
    assert.equal(Number((f.database.prepare("SELECT count(*) AS count FROM webhookDeliveryAttempts").get() as { count: number }).count), 1);
  } finally {
    f.close();
  }
});

test("finish rejects stale leases and marks a successful delivery exactly once", () => {
  const f = fixture();
  try {
    f.insert();
    const claim = f.service.claimDue(NOW, "lease-1")[0]!;
    assert.equal(f.service.finish({
      deliveryId: claim.item.id,
      leaseId: "stale",
      attempt: 1,
      success: true,
      statusCode: 200,
      durationMs: 50,
      now: NOW + 100,
    }), false);
    assert.equal(f.service.finish({
      deliveryId: claim.item.id,
      leaseId: "lease-1",
      attempt: 1,
      success: true,
      statusCode: 200,
      durationMs: 50,
      now: NOW + 100,
    }), true);
    assert.equal(f.service.finish({
      deliveryId: claim.item.id,
      leaseId: "lease-1",
      attempt: 1,
      success: true,
      statusCode: 200,
      durationMs: 50,
      now: NOW + 200,
    }), false);
    const delivery = f.database.prepare("SELECT * FROM webhookDeliveries WHERE id='delivery-1'").get() as Record<string, unknown>;
    assert.equal(delivery.status, "delivered");
    assert.equal(delivery.deliveredAt, NOW + 100);
  } finally {
    f.close();
  }
});

test("failed attempts are rescheduled with bounded retry state", () => {
  const f = fixture();
  try {
    f.insert();
    const claim = f.service.claimDue(NOW, "lease-1")[0]!;
    assert.equal(f.service.finish({
      deliveryId: claim.item.id,
      leaseId: claim.leaseId,
      attempt: claim.attempt,
      success: false,
      statusCode: 503,
      error: "upstream\nfailed",
      durationMs: 75.9,
      now: NOW + 100,
    }), true);
    const delivery = f.database.prepare("SELECT * FROM webhookDeliveries WHERE id='delivery-1'").get() as Record<string, unknown>;
    assert.equal(delivery.status, "pending");
    assert.equal(delivery.nextAttemptAt, NOW + 100 + 60_000);
    assert.equal(delivery.lastError, "upstream failed");
    const attempt = f.database.prepare("SELECT * FROM webhookDeliveryAttempts WHERE deliveryId='delivery-1'").get() as Record<string, unknown>;
    assert.equal(attempt.success, 0);
    assert.equal(attempt.durationMs, 75);
  } finally {
    f.close();
  }
});

test("expired processing leases close abandoned attempt before reclaim", () => {
  const f = fixture();
  try {
    f.insert("delivery-1", "event-1", 0, "pending", NOW - 100_000);
    f.service.claimDue(NOW - 70_000, "lease-old");
    const claims = f.service.claimDue(NOW, "lease-new");
    assert.equal(claims.length, 1);
    assert.equal(claims[0]?.attempt, 2);
    const attempts = f.service.attempts("event-1");
    const abandoned = attempts.find((item) => item.attempt === 1)!;
    assert.equal(abandoned.success, 0);
    assert.equal(abandoned.error, "LEASE_EXPIRED");
  } finally {
    f.close();
  }
});

test("max-attempt expired lease becomes failed instead of reclaiming", () => {
  const f = fixture();
  try {
    f.insert("delivery-1", "event-1", 8, "processing", NOW - 1);
    f.database.prepare(`
      INSERT INTO webhookDeliveryAttempts(id,deliveryId,eventId,attempt,manual,requestedAt,leaseId)
      VALUES ('attempt-8','delivery-1','event-1',8,0,?,'old-lease')
    `).run(NOW - 100_000);
    assert.equal(f.service.claimDue(NOW, "new-lease").length, 0);
    const delivery = f.database.prepare("SELECT * FROM webhookDeliveries WHERE id='delivery-1'").get() as Record<string, unknown>;
    assert.equal(delivery.status, "failed");
    assert.equal(delivery.lastError, "LEASE_EXPIRED");
  } finally {
    f.close();
  }
});

test("manual retry cannot steal an active lease", () => {
  const f = fixture();
  try {
    f.insert();
    f.service.claimDue(NOW, "lease-1");
    assert.throws(() => f.service.retry("event-1", NOW + 1_000), /CONFLICT/);
    const retry = f.service.retry("event-1", NOW + 61_000);
    assert.deepEqual(retry, { eventId: "event-1", attempts: 1 });
    const claim = f.service.claimDue(NOW + 61_000, "manual-lease")[0]!;
    assert.equal(claim.manual, true);
    assert.equal(claim.attempt, 2);
  } finally {
    f.close();
  }
});
