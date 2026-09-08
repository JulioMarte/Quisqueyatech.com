import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getMigrations } from "better-auth/db/migration";
import { createAuthRuntime } from "../../src/server/auth";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { AuthRecoveryService } from "../../src/server/services/auth-recovery";

const AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
const SETUP_CODE = "test-admin-setup-code-0123456789abcdef";
const RECOVERY = Array.from({ length: 8 }, (_, index) => String(index + 1).repeat(64));

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-auth-recovery-"));
  const path = join(directory, "test.sqlite");
  const runtime = createAuthRuntime({
    databasePath: path,
    secret: AUTH_SECRET,
    baseURL: "http://127.0.0.1:8787",
    trustedOrigins: [],
    setupCode: SETUP_CODE,
  });
  const migrations = await getMigrations(runtime.auth.options);
  await migrations.runMigrations();
  const database = new SQLiteDatabase({ path });
  return {
    runtime,
    database,
    recovery: new AuthRecoveryService(database),
    close() {
      database.close();
      runtime.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("recovery replaces credential password, revokes sessions and consumes one code", async () => {
  const f = await fixture();
  try {
    await f.runtime.auth.api.signUpEmail({
      body: { email: "admin@example.com", password: "old-secure-password-123", name: "Admin" },
      headers: new Headers({
        "x-admin-setup-code": SETUP_CODE,
        "x-admin-recovery-hashes": JSON.stringify(RECOVERY),
      }),
    });
    await f.runtime.auth.api.signInEmail({
      body: { email: "admin@example.com", password: "old-secure-password-123" },
    });
    assert.ok((f.database.prepare("SELECT count(*) AS count FROM session").get() as { count: number }).count >= 1);

    assert.deepEqual(await f.recovery.recover({
      codeHash: RECOVERY[0]!,
      newPassword: "new-secure-password-456",
      now: Date.now(),
    }), { ok: true });
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM session").get() as { count: number }).count, 0);
    assert.ok((f.database.prepare("SELECT consumedAt FROM adminRecoveryCodes WHERE codeHash=?").get(RECOVERY[0]!) as { consumedAt: number | null }).consumedAt);

    await assert.rejects(() => f.runtime.auth.api.signInEmail({
      body: { email: "admin@example.com", password: "old-secure-password-123" },
    }));
    const signedIn = await f.runtime.auth.api.signInEmail({
      body: { email: "admin@example.com", password: "new-secure-password-456" },
    });
    assert.equal(signedIn.user.email, "admin@example.com");

    await assert.rejects(() => f.recovery.recover({
      codeHash: RECOVERY[0]!,
      newPassword: "third-secure-password-789",
      now: Date.now() + 100,
    }), /Invalid recovery request/);
  } finally { f.close(); }
});

test("failed recovery releases the claim for a subsequent valid attempt", async () => {
  const f = await fixture();
  try {
    // Install security metadata without creating Better Auth's credential account to force the first attempt to fail.
    f.runtime.adminSecurity.claimSetup(SETUP_CODE, Date.now(), SETUP_CODE);
    f.runtime.adminSecurity.finalizeSetup({
      userId: "missing-user",
      email: "missing@example.com",
      name: "Missing",
      recoveryHashes: RECOVERY,
      now: Date.now(),
    });
    await assert.rejects(() => f.recovery.recover({ codeHash: RECOVERY[1]!, newPassword: "new-secure-password-456" }), /Invalid recovery request/);
    const code = f.database.prepare("SELECT claimedAt,consumedAt FROM adminRecoveryCodes WHERE codeHash=?").get(RECOVERY[1]!) as { claimedAt: number | null; consumedAt: number | null };
    assert.equal(code.claimedAt, null);
    assert.equal(code.consumedAt, null);
  } finally { f.close(); }
});
