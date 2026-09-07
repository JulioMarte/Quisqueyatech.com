import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { SettingsService } from "../../src/server/services/settings";
import { forbiddenIp, normalizedDestination } from "../../src/server/services/webhook-http";
import { WebhookDeliveryWorker } from "../../src/server/workers/webhook-delivery";

const NOW = 1_800_000_000_000;

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-worker-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  return {
    database,
    settings: new SettingsService(database),
    insertDelivery() {
      database.prepare(`
        INSERT INTO webhookDeliveries(id,eventId,type,payload,status,attempts,nextAttemptAt,createdAt)
        VALUES ('delivery-1','event-1','booking.created','{"eventId":"event-1","type":"booking.created"}','pending',0,?,?)
      `).run(NOW, NOW - 1_000);
    },
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("worker does not claim deliveries when webhook runtime is disabled", async () => {
  const f = fixture();
  try {
    f.insertDelivery();
    f.settings.save({ config: { webhookEnabled: false, webhookUrl: "https://hooks.example.com" }, secrets: [], actorEmail: "admin@example.com", now: NOW });
    const worker = new WebhookDeliveryWorker(f.database, async () => ({ success: true, statusCode: 200, durationMs: 1 }), () => NOW);
    assert.equal(await worker.processDue(), 0);
    assert.equal((f.database.prepare("SELECT status FROM webhookDeliveries WHERE id='delivery-1'").get() as { status: string }).status, "pending");
  } finally { f.close(); }
});

test("worker loads internal settings, adds attempt and finishes a delivery", async () => {
  const f = fixture();
  try {
    f.insertDelivery();
    f.settings.save({
      config: { webhookEnabled: true, webhookUrl: "https://hooks.example.com/events" },
      secrets: [{ key: "webhookSecret", ciphertext: "v1.mock", lastFour: "mock", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW,
    });
    const calls: Array<Record<string, string>> = [];
    const worker = new WebhookDeliveryWorker(f.database, async (input) => {
      calls.push(input);
      return { success: true, statusCode: 204, durationMs: 12 };
    }, () => NOW);
    assert.equal(await worker.processDue(), 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "https://hooks.example.com/events");
    assert.equal(calls[0]?.encryptedSecret, "v1.mock");
    assert.equal(calls[0]?.eventId, "event-1");
    assert.equal(JSON.parse(calls[0]!.body).attempt, 1);
    const delivery = f.database.prepare("SELECT * FROM webhookDeliveries WHERE id='delivery-1'").get() as Record<string, unknown>;
    assert.equal(delivery.status, "delivered");
    assert.equal(delivery.lastStatusCode, 204);
  } finally { f.close(); }
});

test("worker converts unexpected transport throws into retryable network errors", async () => {
  const f = fixture();
  try {
    f.insertDelivery();
    f.settings.save({
      config: { webhookEnabled: true, webhookUrl: "https://hooks.example.com/events" },
      secrets: [{ key: "webhookSecret", ciphertext: "v1.mock", lastFour: "mock", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW,
    });
    const worker = new WebhookDeliveryWorker(f.database, async () => { throw new Error("secret internal error"); }, () => NOW);
    assert.equal(await worker.processDue(), 1);
    const delivery = f.database.prepare("SELECT status,lastError FROM webhookDeliveries WHERE id='delivery-1'").get() as { status: string; lastError: string };
    assert.equal(delivery.status, "pending");
    assert.equal(delivery.lastError, "NETWORK_ERROR");
  } finally { f.close(); }
});

test("webhook destination policy blocks local, private and credentialed destinations", () => {
  for (const destination of [
    "http://localhost/x",
    "http://service.local/x",
    "http://metadata.google.internal/x",
    "http://127.0.0.1/x",
    "http://10.0.0.1/x",
    "http://192.168.1.1/x",
    "http://[::1]/x",
    "https://user:password@example.com/x",
  ]) assert.throws(() => normalizedDestination(destination), /(DESTINATION_BLOCKED|INVALID_DESTINATION)/, destination);

  assert.equal(normalizedDestination("https://hooks.example.com/events").hostname, "hooks.example.com");
  assert.equal(forbiddenIp("169.254.169.254"), true);
  assert.equal(forbiddenIp("8.8.8.8"), false);
});
