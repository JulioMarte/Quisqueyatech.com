import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getMigrations } from "better-auth/db/migration";
import { createApiRuntime } from "../../src/server/api";
import { SettingsService } from "../../src/server/services/settings";

const AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
const ADMIN_SECRET = "test-admin-api-secret-0123456789abcdef";
const SETUP_CODE = "test-admin-setup-code-0123456789abcdef";
const RECOVERY = Array.from({ length: 8 }, (_, index) => String(index + 1).repeat(64));

async function fixture(options: { setupCode?: string } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-api-"));
  const databasePath = join(directory, "test.sqlite");
  const runtime = createApiRuntime({
    databasePath,
    authSecret: AUTH_SECRET,
    authBaseURL: "http://127.0.0.1",
    trustedOrigins: ["https://preview.quisqueyatech.com"],
    adminSetupCode: options.setupCode ?? "",
    adminApiSecret: ADMIN_SECRET,
  });
  const migrations = await getMigrations(runtime.auth.options);
  await migrations.runMigrations();
  const server = createServer((request, response) => {
    runtime.handler(request, response).catch((error) => {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    runtime,
    origin,
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      runtime.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("health and setup status are available without exposing machine runtime", async () => {
  const f = await fixture({ setupCode: SETUP_CODE });
  try {
    const health = await fetch(`${f.origin}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, database: "sqlite" });

    const status = await fetch(`${f.origin}/admin/setup/status`);
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { status: "uninitialized", setupCodeRequired: true });

    const unauthorized = await fetch(`${f.origin}/machine/runtime`);
    assert.equal(unauthorized.status, 401);
  } finally { await f.close(); }
});

test("machine runtime requires exact bearer and returns internal encrypted settings only to it", async () => {
  const f = await fixture();
  try {
    new SettingsService(f.runtime.database).save({
      config: { webhookEnabled: true, webhookUrl: "https://hooks.example.com/events" },
      secrets: [{ key: "webhookSecret", ciphertext: "v1.encrypted", lastFour: "pted", version: 1 }],
      actorEmail: "admin@example.com",
    });
    const wrong = await fetch(`${f.origin}/machine/runtime`, { headers: { authorization: `Bearer ${ADMIN_SECRET}x` } });
    assert.equal(wrong.status, 401);
    const response = await fetch(`${f.origin}/machine/runtime`, { headers: { authorization: `Bearer ${ADMIN_SECRET}` } });
    assert.equal(response.status, 200);
    const payload = await response.json() as { config: Record<string, unknown>; secrets: Record<string, string> };
    assert.equal(payload.config.webhookEnabled, true);
    assert.equal(payload.secrets.webhookSecret, "v1.encrypted");
  } finally { await f.close(); }
});

test("Better Auth signup is gated by setup code and finalizes first admin with recovery hashes", async () => {
  const f = await fixture({ setupCode: SETUP_CODE });
  try {
    const body = JSON.stringify({
      email: "admin@example.com",
      password: "very-secure-admin-password",
      name: "Admin",
    });
    const denied = await fetch(`${f.origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-recovery-hashes": JSON.stringify(RECOVERY) },
      body,
    });
    assert.ok(denied.status >= 400);
    assert.equal((await fetch(`${f.origin}/admin/setup/status`).then((response) => response.json()) as { status: string }).status, "uninitialized");

    const created = await fetch(`${f.origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-setup-code": SETUP_CODE,
        "x-admin-recovery-hashes": JSON.stringify(RECOVERY),
      },
      body,
    });
    assert.ok(created.status >= 200 && created.status < 300, await created.text());
    const installation = f.runtime.database.prepare("SELECT * FROM adminInstallation WHERE singleton='admin'").get() as Record<string, unknown>;
    assert.equal(installation.status, "configured");
    assert.equal(installation.adminEmail, "admin@example.com");
    assert.equal((f.runtime.database.prepare("SELECT count(*) AS count FROM adminRecoveryCodes").get() as { count: number }).count, 8);
    assert.equal((f.runtime.database.prepare("SELECT count(*) AS count FROM user").get() as { count: number }).count, 1);

    const second = await fetch(`${f.origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-setup-code": SETUP_CODE,
        "x-admin-recovery-hashes": JSON.stringify(RECOVERY),
      },
      body: JSON.stringify({ email: "attacker@example.com", password: "another-secure-password", name: "Attacker" }),
    });
    assert.ok(second.status >= 400);
    assert.equal((f.runtime.database.prepare("SELECT count(*) AS count FROM user").get() as { count: number }).count, 1);
  } finally { await f.close(); }
});

test("auth CORS only grants credentials to configured trusted origins", async () => {
  const f = await fixture();
  try {
    const allowed = await fetch(`${f.origin}/api/auth/ok`, { headers: { origin: "https://preview.quisqueyatech.com" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://preview.quisqueyatech.com");
    assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");

    const blockedPreflight = await fetch(`${f.origin}/api/auth/sign-in/email`, {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(blockedPreflight.status, 403);
  } finally { await f.close(); }
});
