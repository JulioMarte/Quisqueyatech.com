import assert from "node:assert/strict";
import { createCipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiRuntime } from "../../src/server/api";
import { createAssessmentSnapshot } from "../../src/server/domain/assessment/engine";
import { AgendaService } from "../../src/server/services/agenda";
import { AssessmentService } from "../../src/server/services/assessments";
import { SettingsService } from "../../src/server/services/settings";

const AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
const ADMIN_SECRET = "test-admin-api-secret-0123456789abcdef";
const ASSESSMENT_TOKEN_SECRET = "test-assessment-token-secret-0123456789abcdef";
const EA_TOKEN = "easy-appointments-webhook-token-0123456789";
const TWILIO_TOKEN = "twilio-auth-token-0123456789abcdef";
const ULTRAVOX_WEBHOOK_SECRET = "ultravox-webhook-secret-0123456789abcdef";
const WEBHOOK_PUBLIC_BASE_URL = "https://api.quisqueyatech.test";
const ENCRYPTION_KEY = "33".repeat(32);

function encryptSetting(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-provider-webhooks-"));
  const databasePath = join(directory, "test.sqlite");
  const previousEncryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
  process.env.CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  const transcriptCalls: string[] = [];
  const runtime = createApiRuntime({
    databasePath,
    authSecret: AUTH_SECRET,
    authBaseURL: "http://127.0.0.1",
    adminApiSecret: ADMIN_SECRET,
    assessmentTokenSecret: ASSESSMENT_TOKEN_SECRET,
    easyAppointmentsWebhookToken: EA_TOKEN,
    twilioAuthToken: TWILIO_TOKEN,
    webhookPublicBaseURL: WEBHOOK_PUBLIC_BASE_URL,
    ultravoxTranscriptFetcher: async (callId) => {
      transcriptCalls.push(callId);
      return "user: El proceso es manual. password=SuperSecret123\nagent: Entendido.";
    },
  });
  const settings = new SettingsService(runtime.database);
  settings.save({
    actorEmail: "ci@quisqueyatech.com",
    config: {
      ultravoxApiUrl: "https://api.ultravox.ai/api/calls",
      ultravoxModel: "fixie-ai/ultravox",
      ultravoxVoice: "test-voice",
    },
    secrets: [
      { key: "ultravoxApiKey", ciphertext: encryptSetting("ultravox-api-key"), lastFour: "-key", version: 1 },
      { key: "ultravoxWebhookSecret", ciphertext: encryptSetting(ULTRAVOX_WEBHOOK_SECRET), lastFour: "cdef", version: 1 },
    ],
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
    transcriptCalls,
    origin: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      runtime.close();
      if (previousEncryptionKey === undefined) delete process.env.CONFIG_ENCRYPTION_KEY;
      else process.env.CONFIG_ENCRYPTION_KEY = previousEncryptionKey;
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function twilioSignature(path: string, form: Record<string, string>) {
  const signedUrl = `${WEBHOOK_PUBLIC_BASE_URL}${path}`;
  const payload = signedUrl + Object.keys(form).sort().map((key) => `${key}${form[key]}`).join("");
  return createHmac("sha1", TWILIO_TOKEN).update(payload).digest("base64");
}

function ultravoxSignature(raw: string, timestamp: string) {
  return createHmac("sha256", ULTRAVOX_WEBHOOK_SECRET).update(raw + timestamp).digest("hex");
}

test("Easy!Appointments webhook rejects forged requests and processes valid events idempotently", async () => {
  const f = await fixture();
  try {
    const agenda = new AgendaService(f.runtime.database);
    const start = new Date(Date.now() + 7 * 86_400_000).toISOString();
    agenda.upsertFromProvider({
      bookingId: "ea-booking-1",
      externalId: "42",
      firstName: "Ana",
      lastName: "Perez",
      company: "Clinica Norte",
      role: "Administradora",
      country: "DO",
      locale: "es",
      email: "ana@example.com",
      phone: "+18095550000",
      recordingConsent: true,
      processingConsent: true,
      start,
      timezone: "America/Santo_Domingo",
      channel: "web",
      status: "confirmed",
      createdAt: Date.now(),
    });

    const payload = { appointment: { id: 42 } };
    const forged = await fetch(`${f.origin}/api/webhooks/easy-appointments`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ea-token": "wrong" },
      body: JSON.stringify(payload),
    });
    assert.equal(forged.status, 401);

    const headers = {
      "content-type": "application/json",
      "x-ea-token": EA_TOKEN,
      "x-ea-event-id": "ea-event-42-delete",
      "x-ea-action": "Delete",
      "x-request-id": "ci-request-42",
    };
    const accepted = await fetch(`${f.origin}/api/webhooks/easy-appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    assert.equal(accepted.status, 200, await accepted.clone().text());
    assert.deepEqual(await accepted.json(), { ok: true, requestId: "ci-request-42" });
    assert.equal(agenda.byBookingId("ea-booking-1")?.status, "cancelled");

    const duplicate = await fetch(`${f.origin}/api/webhooks/easy-appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    assert.equal(duplicate.status, 200);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM webhookEvents WHERE eventId='ea-event-42-delete'").get() as { count: number }).count), 1);

    const hashPayload = JSON.stringify({ appointment: { id: 77 } });
    const hashed = await fetch(`${f.origin}/api/webhooks/easy-appointments`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ea-token": EA_TOKEN, "x-ea-action": "Save" },
      body: hashPayload,
    });
    assert.equal(hashed.status, 200);
    const expectedId = createHash("sha256").update(hashPayload).digest("base64url");
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM webhookEvents WHERE eventId=?").get(expectedId) as { count: number }).count), 1);
  } finally { await f.close(); }
});

test("Twilio webhook validates the public URL signature and records call state once", async () => {
  const f = await fixture();
  try {
    const path = "/api/webhooks/twilio?source=status";
    const form = { CallSid: "CA123456789", CallStatus: "completed" };
    const encoded = new URLSearchParams(form).toString();

    const forged = await fetch(`${f.origin}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "invalid",
      },
      body: encoded,
    });
    assert.equal(forged.status, 401);

    const signature = twilioSignature(path, form);
    const accepted = await fetch(`${f.origin}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": signature,
      },
      body: encoded,
    });
    assert.equal(accepted.status, 200, await accepted.clone().text());
    assert.deepEqual(await accepted.json(), { ok: true });

    const duplicate = await fetch(`${f.origin}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": signature,
      },
      body: encoded,
    });
    assert.equal(duplicate.status, 200);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM webhookEvents WHERE eventId='CA123456789:completed'").get() as { count: number }).count), 1);
  } finally { await f.close(); }
});

test("Ultravox webhook rejects invalid/stale signatures and records non-terminal events idempotently", async () => {
  const f = await fixture();
  try {
    const payload = {
      event: "call.started",
      call: { callId: "uv-call-started", created: new Date().toISOString() },
    };
    const raw = JSON.stringify(payload);
    const timestamp = new Date().toISOString();

    const forged = await fetch(`${f.origin}/api/webhooks/ultravox`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ultravox-webhook-timestamp": timestamp,
        "x-ultravox-webhook-signature": "deadbeef",
      },
      body: raw,
    });
    assert.equal(forged.status, 401);

    const staleTimestamp = new Date(Date.now() - 120_000).toISOString();
    const stale = await fetch(`${f.origin}/api/webhooks/ultravox`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ultravox-webhook-timestamp": staleTimestamp,
        "x-ultravox-webhook-signature": ultravoxSignature(raw, staleTimestamp),
      },
      body: raw,
    });
    assert.equal(stale.status, 401);

    const signature = ultravoxSignature(raw, timestamp);
    const accepted = await fetch(`${f.origin}/api/webhooks/ultravox`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ultravox-webhook-timestamp": timestamp,
        "x-ultravox-webhook-signature": `bad, ${signature}`,
      },
      body: raw,
    });
    assert.equal(accepted.status, 204);

    const duplicate = await fetch(`${f.origin}/api/webhooks/ultravox`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ultravox-webhook-timestamp": timestamp,
        "x-ultravox-webhook-signature": signature,
      },
      body: raw,
    });
    assert.equal(duplicate.status, 204);
    const eventId = `call.started:uv-call-started:${payload.call.created}`;
    const row = f.runtime.database.prepare("SELECT status,attempts FROM webhookEvents WHERE eventId=?").get(eventId) as Record<string, unknown>;
    assert.equal(row.status, "processed");
    assert.equal(Number(row.attempts), 1);
  } finally { await f.close(); }
});

test("Ultravox call.ended finalizes the matching SQLite assessment exactly once and redacts transcript", async () => {
  const f = await fixture();
  try {
    const assessments = new AssessmentService(f.runtime.database);
    const assessmentId = randomUUID();
    const sessionKey = randomUUID();
    const now = Date.now();
    assessments.create({
      assessmentId,
      firstName: "Ana",
      lastName: "Perez",
      company: "Clinica Norte",
      role: "Administradora",
      country: "DO",
      locale: "es",
      email: "ana@example.com",
      phone: "+18095550000",
      processingConsent: true,
      recordingConsent: true,
      mode: "now",
      provider: "ultravox",
      frameworkVersion: "2026-07-v1",
      snapshot: createAssessmentSnapshot("es", now),
      createdAt: now,
      audioExpiresAt: now + 86_400_000,
      transcriptExpiresAt: now + 30 * 86_400_000,
      leadExpiresAt: now + 30 * 86_400_000,
    });
    assessments.setProviderSession({
      assessmentId,
      sessionKey,
      provider: "ultravox",
      providerSessionId: "uv-call-ended",
      supportId: randomUUID(),
      frameworkVersion: "2026-07-v1",
      startedAt: now,
    });

    const created = new Date(now - 180_000).toISOString();
    const ended = new Date(now).toISOString();
    const payload = {
      event: "call.ended",
      call: {
        callId: "uv-call-ended",
        created,
        ended,
        endReason: "hangup",
        metadata: { assessmentId, locale: "es" },
      },
    };
    const raw = JSON.stringify(payload);
    const timestamp = new Date().toISOString();
    const headers = {
      "content-type": "application/json",
      "x-ultravox-webhook-timestamp": timestamp,
      "x-ultravox-webhook-signature": ultravoxSignature(raw, timestamp),
    };

    const accepted = await fetch(`${f.origin}/api/webhooks/ultravox`, { method: "POST", headers, body: raw });
    assert.equal(accepted.status, 204, await accepted.clone().text());
    assert.deepEqual(f.transcriptCalls, ["uv-call-ended"]);

    const state = assessments.getState(assessmentId);
    assert.equal(state?.status, "completed");
    assert.equal(state?.reportStatus, "review_pending");
    assert.match(String(state?.transcript), /\[REDACTED\]/);
    assert.doesNotMatch(String(state?.transcript), /SuperSecret123/);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM voiceMetrics WHERE assessmentId=?").get(assessmentId) as { count: number }).count), 1);

    const duplicate = await fetch(`${f.origin}/api/webhooks/ultravox`, { method: "POST", headers, body: raw });
    assert.equal(duplicate.status, 204);
    assert.deepEqual(f.transcriptCalls, ["uv-call-ended"]);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM voiceMetrics WHERE assessmentId=?").get(assessmentId) as { count: number }).count), 1);
  } finally { await f.close(); }
});
