import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { SettingsService } from "../../src/server/services/settings";

const NOW = 1_800_000_000_000;

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-settings-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  return {
    database,
    service: new SettingsService(database),
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("unsupported config and invalid secrets are rejected", () => {
  const f = fixture();
  try {
    assert.throws(() => f.service.save({ config: { arbitrary: true }, secrets: [], actorEmail: "admin@example.com", now: NOW }), /unsupported configuration field/);
    assert.throws(() => f.service.save({
      config: {},
      secrets: [{ key: "webhookSecret", ciphertext: "plaintext", lastFour: "1234", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW,
    }), /invalid secret setting/);
    assert.throws(() => f.service.save({
      config: {},
      secrets: [{ key: "unknown", ciphertext: "v1.cipher", lastFour: "1234", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW,
    }), /invalid secret setting/);
  } finally { f.close(); }
});

test("admin view never exposes ciphertext while internal runtime does", () => {
  const f = fixture();
  try {
    f.service.save({
      config: { webhookEnabled: true, webhookUrl: "https://hooks.example.com/events", defaultProvider: "livekit" },
      secrets: [{ key: "webhookSecret", ciphertext: "v1.encrypted-secret", lastFour: "cret", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW,
    });
    const admin = f.service.adminGet();
    assert.deepEqual(admin.config, { webhookEnabled: true, webhookUrl: "https://hooks.example.com/events", defaultProvider: "livekit" });
    assert.deepEqual(admin.secrets.webhookSecret, { configured: true, lastFour: "cret", updatedAt: NOW });
    assert.equal(JSON.stringify(admin).includes("encrypted-secret"), false);

    const runtime = f.service.internalRuntime();
    assert.equal(runtime.secrets.webhookSecret, "v1.encrypted-secret");
  } finally { f.close(); }
});

test("settings upsert and audit only record real config changes plus supplied secret rotations", () => {
  const f = fixture();
  try {
    const first = f.service.save({
      config: { webhookEnabled: false, defaultProvider: "livekit" },
      secrets: [],
      actorEmail: "admin@example.com",
      now: NOW,
    });
    assert.deepEqual(first.changedFields, ["defaultProvider", "webhookEnabled"]);

    const unchanged = f.service.save({
      config: { webhookEnabled: false, defaultProvider: "livekit" },
      secrets: [],
      actorEmail: "admin@example.com",
      now: NOW + 1,
    });
    assert.deepEqual(unchanged.changedFields, []);
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM configurationAudit").get() as { count: number }).count, 1);

    const changed = f.service.save({
      config: { webhookEnabled: true, defaultProvider: "livekit" },
      secrets: [
        { key: "webhookSecret", ciphertext: "v1.new", lastFour: "new1", version: 1 },
        { key: "geminiApiKey", ciphertext: "v1.gemini", lastFour: "mini", version: 1 },
      ],
      actorEmail: "admin2@example.com",
      now: NOW + 2,
    });
    assert.deepEqual(changed.changedFields, ["webhookEnabled"]);
    assert.deepEqual(changed.changedSecretKeys, ["geminiApiKey", "webhookSecret"]);

    const latest = f.database.prepare("SELECT * FROM configurationAudit ORDER BY createdAt DESC LIMIT 1").get() as Record<string, unknown>;
    assert.deepEqual(JSON.parse(String(latest.changedFields)), ["webhookEnabled"]);
    assert.deepEqual(JSON.parse(String(latest.changedSecretKeys)), ["geminiApiKey", "webhookSecret"]);
    assert.equal(latest.actorEmail, "admin2@example.com");
  } finally { f.close(); }
});

test("secret rotation replaces ciphertext metadata without duplicate keys", () => {
  const f = fixture();
  try {
    f.service.save({
      config: {},
      secrets: [{ key: "livekitApiSecret", ciphertext: "v1.first", lastFour: "1111", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW,
    });
    f.service.save({
      config: {},
      secrets: [{ key: "livekitApiSecret", ciphertext: "v1.second", lastFour: "2222", version: 1 }],
      actorEmail: "admin@example.com",
      now: NOW + 100,
    });
    const runtime = f.service.internalRuntime();
    assert.equal(runtime.secrets.livekitApiSecret, "v1.second");
    const admin = f.service.adminGet();
    assert.deepEqual(admin.secrets.livekitApiSecret, { configured: true, lastFour: "2222", updatedAt: NOW + 100 });
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM secretSettings WHERE key='livekitApiSecret'").get() as { count: number }).count, 1);
  } finally { f.close(); }
});
