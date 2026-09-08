import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiRuntime } from "../../src/server/api";

const AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
const ADMIN_SECRET = "test-admin-api-secret-0123456789abcdef";
const TRUSTED_ORIGIN = "https://www.quisqueyatech.com";

async function fixture(verifyOk = true) {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-scheduling-api-"));
  const databasePath = join(directory, "test.sqlite");
  const runtime = createApiRuntime({
    databasePath,
    authSecret: AUTH_SECRET,
    authBaseURL: "http://127.0.0.1",
    trustedOrigins: [TRUSTED_ORIGIN],
    adminApiSecret: ADMIN_SECRET,
    clientIpHeaders: ["x-real-ip"],
    verifyTurnstile: async () => verifyOk
      ? { ok: true, supportId: "test-support" }
      : { ok: false, supportId: "test-support", code: "TURNSTILE_REJECTED" },
  });
  const server = createServer((request, response) => {
    runtime.handler(request, response).catch((error) => {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  return {
    runtime,
    origin: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      runtime.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function dateString(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

async function firstAvailableSlot(origin: string) {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000);
    const civil = dateString(date);
    const response = await fetch(`${origin}/api/scheduling/availability?date=${civil}&timezone=America%2FSanto_Domingo&locale=es`, {
      headers: { origin: TRUSTED_ORIGIN, "x-real-ip": "203.0.113.10" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), TRUSTED_ORIGIN);
    const payload = await response.json() as { configured: boolean; slots: Array<{ start: string; label: string }> };
    if (payload.slots.length) return payload.slots[0].start;
  }
  throw new Error("No default scheduling slot available in the next 14 days");
}

function bookingBody(start: string, bookingAttemptId = randomUUID()) {
  return {
    firstName: "Ana",
    lastName: "Perez",
    company: "Clinica Dental Norte",
    role: "Administradora",
    country: "DO",
    locale: "es",
    email: "ana@example.com",
    phone: "+18095550000",
    notes: "Evaluacion inicial",
    processingConsent: true,
    recordingConsent: true,
    website: "",
    turnstileToken: "test-token",
    start,
    timezone: "America/Santo_Domingo",
    channel: "web",
    bookingAttemptId,
  };
}

test("availability preserves the historical public contract and validation", async () => {
  const f = await fixture();
  try {
    const invalid = await fetch(`${f.origin}/api/scheduling/availability?date=2026-02-31&timezone=America%2FSanto_Domingo&locale=es`, {
      headers: { "x-real-ip": "203.0.113.11" },
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: "Invalid date" });

    const slot = await firstAvailableSlot(f.origin);
    assert.match(slot, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  } finally { await f.close(); }
});

test("booking endpoint verifies human, is idempotent and rejects a second booking for the slot", async () => {
  const f = await fixture();
  try {
    const slot = await firstAvailableSlot(f.origin);
    const bookingAttemptId = randomUUID();
    const headers = {
      "content-type": "application/json",
      origin: TRUSTED_ORIGIN,
      "x-real-ip": "203.0.113.12",
    };
    const first = await fetch(`${f.origin}/api/scheduling/book`, {
      method: "POST",
      headers,
      body: JSON.stringify(bookingBody(slot, bookingAttemptId)),
    });
    assert.equal(first.status, 200, await first.text());
    const firstPayload = await first.json() as { ok: boolean; bookingId: string; confirmed: boolean; status: string };
    assert.deepEqual(firstPayload, {
      ok: true,
      bookingId: bookingAttemptId,
      configured: true,
      confirmed: true,
      status: "confirmed",
    });

    const duplicate = await fetch(`${f.origin}/api/scheduling/book`, {
      method: "POST",
      headers,
      body: JSON.stringify(bookingBody(slot, bookingAttemptId)),
    });
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json() as { bookingId: string }).bookingId, bookingAttemptId);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM bookings").get() as { count: number }).count), 1);

    const conflict = await fetch(`${f.origin}/api/scheduling/book`, {
      method: "POST",
      headers,
      body: JSON.stringify(bookingBody(slot, randomUUID())),
    });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json() as { code: string }).code, "slot_unavailable");
  } finally { await f.close(); }
});

test("booking endpoint fails closed when Turnstile rejects and persistent IP limit is enforced", async () => {
  const f = await fixture(false);
  try {
    const slot = await firstAvailableSlot(f.origin);
    const rejected = await fetch(`${f.origin}/api/scheduling/book`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "203.0.113.13" },
      body: JSON.stringify(bookingBody(slot)),
    });
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json() as { code: string }).code, "TURNSTILE_REJECTED");
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM bookings").get() as { count: number }).count), 0);

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await fetch(`${f.origin}/api/scheduling/book`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "203.0.113.13" },
        body: JSON.stringify({}),
      });
      assert.notEqual(response.status, 429);
    }
    const limited = await fetch(`${f.origin}/api/scheduling/book`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "203.0.113.13" },
      body: JSON.stringify({}),
    });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) >= 1);
  } finally { await f.close(); }
});
