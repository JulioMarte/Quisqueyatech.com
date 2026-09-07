import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { AdminSecurityService } from "../../src/server/services/admin-security";

const NOW = 1_800_000_000_000;
const SETUP_CODE = "a-very-long-admin-setup-code-123456";
const hashes = Array.from({ length: 8 }, (_, index) => String(index + 1).repeat(64));

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-admin-security-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  return {
    database,
    service: new AdminSecurityService(database),
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("admin setup claim enforces configured code and lease", () => {
  const f = fixture();
  try {
    assert.deepEqual(f.service.setupStatus(NOW, SETUP_CODE), { status: "uninitialized", setupCodeRequired: true });
    assert.deepEqual(f.service.claimSetup("wrong", NOW, SETUP_CODE), { ok: false });
    assert.deepEqual(f.service.claimSetup(SETUP_CODE, NOW, SETUP_CODE), { ok: true });
    assert.deepEqual(f.service.claimSetup(SETUP_CODE, NOW + 1, SETUP_CODE), { ok: false });
    assert.equal(f.service.setupStatus(NOW + 1, SETUP_CODE).status, "provisioning");
    assert.equal(f.service.setupStatus(NOW + 120_001, SETUP_CODE).status, "uninitialized");
    assert.deepEqual(f.service.claimSetup(SETUP_CODE, NOW + 120_001, SETUP_CODE), { ok: true });
  } finally { f.close(); }
});

test("finalize setup requires exactly eight SHA-256 recovery hashes", () => {
  const f = fixture();
  try {
    f.service.claimSetup("", NOW, "");
    assert.throws(() => f.service.finalizeSetup({ userId: "user-1", email: "ADMIN@EXAMPLE.COM", name: "Admin", recoveryHashes: hashes.slice(0, 7), now: NOW + 1 }), /Setup claim expired/);
    assert.equal(f.service.finalizeSetup({ userId: "user-1", email: "ADMIN@EXAMPLE.COM", name: "Admin", recoveryHashes: hashes, now: NOW + 1 }), true);
    const installation = f.service.getInstallation();
    assert.equal(installation?.status, "configured");
    assert.equal(installation?.adminEmail, "admin@example.com");
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM adminRecoveryCodes").get() as { count: number }).count, 8);
    assert.deepEqual(f.service.claimSetup("", NOW + 2, ""), { ok: false });
  } finally { f.close(); }
});

test("recovery code claim is leased, releasable and single-use after consume", () => {
  const f = fixture();
  try {
    f.service.claimSetup("", NOW, "");
    f.service.finalizeSetup({ userId: "user-1", email: "admin@example.com", name: "Admin", recoveryHashes: hashes, now: NOW + 1 });
    const hash = hashes[0]!;
    const claim = f.service.claimRecoveryCode(hash, NOW + 2)!;
    assert.equal(claim.userId, "user-1");
    assert.equal(f.service.claimRecoveryCode(hash, NOW + 3), null);
    assert.equal(f.service.releaseRecoveryCode(hash, claim.claimedAt), true);
    const second = f.service.claimRecoveryCode(hash, NOW + 4)!;
    assert.equal(f.service.consumeRecoveryCode(hash, second.claimedAt, NOW + 5), true);
    assert.equal(f.service.claimRecoveryCode(hash, NOW + 6), null);
    assert.equal(f.service.releaseRecoveryCode(hash, second.claimedAt), false);
  } finally { f.close(); }
});

test("content agents require two-phase activation and expose no token hashes in list", () => {
  const f = fixture();
  try {
    f.service.createAgent({
      keyId: "agent-1", name: "Writer", tokenHash: "hash-1", prefix: "qt_abc", activationId: "activation-1",
      requestLimit: 100, uploadLimit: 10, createdBy: "admin@example.com", now: NOW,
    });
    assert.equal(f.service.authenticateAgent("hash-1", "request", NOW + 1).status, "unauthorized");
    assert.throws(() => f.service.activateAgentCredential("agent-1", "wrong", NOW + 1), /CONFLICT/);
    assert.equal(f.service.activateAgentCredential("agent-1", "activation-1", NOW + 1), true);
    assert.equal(f.service.authenticateAgent("hash-1", "request", NOW + 2).status, "ok");
    const listed = f.service.listAgents(NOW + 2);
    assert.equal(listed[0]?.status, "active");
    assert.equal(JSON.stringify(listed).includes("hash-1"), false);
  } finally { f.close(); }
});

test("agent rotation is leased and activation swaps the credential atomically", () => {
  const f = fixture();
  try {
    f.service.createAgent({
      keyId: "agent-1", name: "Writer", tokenHash: "hash-1", prefix: "qt_old", activationId: "first",
      requestLimit: 100, uploadLimit: 10, createdBy: "admin@example.com", now: NOW,
    });
    f.service.activateAgentCredential("agent-1", "first", NOW + 1);
    assert.equal(f.service.prepareAgentRotation({ keyId: "agent-1", tokenHash: "hash-2", prefix: "qt_new", activationId: "second", now: NOW + 2 }), true);
    assert.throws(() => f.service.prepareAgentRotation({ keyId: "agent-1", tokenHash: "hash-3", prefix: "qt_x", activationId: "third", now: NOW + 3 }), /CONFLICT/);
    assert.equal(f.service.authenticateAgent("hash-1", "request", NOW + 3).status, "ok");
    f.service.activateAgentCredential("agent-1", "second", NOW + 4);
    assert.equal(f.service.authenticateAgent("hash-1", "request", NOW + 5).status, "unauthorized");
    assert.equal(f.service.authenticateAgent("hash-2", "request", NOW + 5).status, "ok");
  } finally { f.close(); }
});

test("agent and security rate limits preserve independent windows", () => {
  const f = fixture();
  try {
    assert.deepEqual(f.service.checkSecurityRateLimit("login:ip", 2, 10_000, NOW), { allowed: true, retryAfter: 0 });
    assert.deepEqual(f.service.checkSecurityRateLimit("login:ip", 2, 10_000, NOW + 1), { allowed: true, retryAfter: 0 });
    assert.equal(f.service.checkSecurityRateLimit("login:ip", 2, 10_000, NOW + 2).allowed, false);
    assert.deepEqual(f.service.checkSecurityRateLimit("login:ip", 2, 10_000, NOW + 10_001), { allowed: true, retryAfter: 0 });

    f.service.createAgent({
      keyId: "agent-1", name: "Writer", tokenHash: "hash", prefix: "qt", activationId: "activate",
      requestLimit: 10, uploadLimit: 1, createdBy: "admin@example.com", now: NOW,
    });
    f.service.activateAgentCredential("agent-1", "activate", NOW + 1);
    assert.equal(f.service.authenticateAgent("hash", "upload", NOW + 2).status, "ok");
    assert.equal(f.service.authenticateAgent("hash", "upload", NOW + 3).status, "limited");
    assert.equal(f.service.authenticateAgent("hash", "request", NOW + 3).status, "ok");
  } finally { f.close(); }
});

test("security cleanup expires pending rotations and stale limiter rows", () => {
  const f = fixture();
  try {
    f.service.createAgent({
      keyId: "pending", name: "Pending", tokenHash: "hash", prefix: "qt", activationId: "activate",
      requestLimit: 10, uploadLimit: 1, createdBy: "admin@example.com", now: NOW,
    });
    f.service.checkSecurityRateLimit("old", 1, 1_000, NOW - 7_200_000);
    f.service.cleanup(NOW + 1_800_001);
    assert.equal(f.service.listAgents(NOW + 1_800_001)[0]?.status, "revoked");
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM authSecurityRateLimits").get() as { count: number }).count, 0);
  } finally { f.close(); }
});
