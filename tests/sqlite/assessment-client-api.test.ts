import assert from "node:assert/strict";
import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiRuntime } from "../../src/server/api";
import { SettingsService } from "../../src/server/services/settings";

const AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
const ADMIN_SECRET = "test-admin-api-secret-0123456789abcdef";
const WORKER_SECRET = "test-assessment-worker-secret-0123456789abcdef";
const TOKEN_SECRET = "test-assessment-token-secret-0123456789abcdef";
const ENCRYPTION_KEY = "22".repeat(32);
const TRUSTED_ORIGIN = "https://www.quisqueyatech.com";

function encryptSetting(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

async function fixture(options: { turnstileOk?: boolean } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-assessment-client-api-"));
  const databasePath = join(directory, "test.sqlite");
  const previousEncryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
  process.env.CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  const voiceCalls = {
    creates: [] as Array<Record<string, unknown>>,
    deletes: [] as string[],
    reissues: [] as Array<Record<string, unknown>>,
  };
  const assessmentVoice = {
    async createSession(input: {
      assessmentId: string;
      sessionKey: string;
      locale: "es" | "en";
      name: string;
      resumeSummary?: string;
    }) {
      voiceCalls.creates.push({ ...input });
      return {
        provider: "livekit" as const,
        assessmentId: input.assessmentId,
        roomUrl: "wss://livekit.example.test",
        token: `participant-${input.sessionKey}`,
        roomName: `assessment-${input.assessmentId}-${input.sessionKey}`,
        supportId: randomUUID(),
        dispatchId: `dispatch-${input.sessionKey}`,
        agentReadyAtStart: true,
      };
    },
    async deleteRoom(roomName: string) {
      voiceCalls.deletes.push(roomName);
    },
    async issueParticipantToken(input: {
      assessmentId: string;
      sessionKey: string;
      locale: "es" | "en";
      name: string;
      roomName: string;
    }) {
      voiceCalls.reissues.push({ ...input });
      return {
        roomUrl: "wss://livekit.example.test",
        token: `reissued-${input.sessionKey}`,
      };
    },
  };
  const runtime = createApiRuntime({
    databasePath,
    authSecret: AUTH_SECRET,
    authBaseURL: "http://127.0.0.1",
    trustedOrigins: [TRUSTED_ORIGIN],
    adminApiSecret: ADMIN_SECRET,
    assessmentWorkerSecret: WORKER_SECRET,
    assessmentTokenSecret: TOKEN_SECRET,
    clientIpHeaders: ["x-real-ip"],
    assessmentVoice,
    verifyTurnstile: async () => options.turnstileOk === false
      ? { ok: false as const, supportId: "turnstile-test", code: "TURNSTILE_REJECTED" as const }
      : { ok: true as const, supportId: "turnstile-test" },
  });
  const settings = new SettingsService(runtime.database);
  settings.save({
    actorEmail: "ci@quisqueyatech.com",
    config: {
      livekitUrl: "wss://livekit.example.test",
      geminiLiveModel: "gemini-3.1-flash-live-preview",
      geminiLiveVoice: "Aoede",
    },
    secrets: [
      { key: "livekitApiKey", ciphertext: encryptSetting("livekit-key"), lastFour: "-key", version: 1 },
      { key: "livekitApiSecret", ciphertext: encryptSetting("livekit-secret"), lastFour: "cret", version: 1 },
      { key: "geminiApiKey", ciphertext: encryptSetting("gemini-key"), lastFour: "-key", version: 1 },
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
    voiceCalls,
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

function publicHeaders(json = false, ip = "203.0.113.50") {
  return {
    origin: TRUSTED_ORIGIN,
    "x-real-ip": ip,
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

async function startConference(origin: string, extras: Record<string, unknown> = {}) {
  const response = await fetch(`${origin}/api/assessment/start`, {
    method: "POST",
    headers: publicHeaders(true),
    body: JSON.stringify({
      mode: "conference",
      locale: "es",
      visitorId: randomUUID(),
      turnstileToken: "test-turnstile-token",
      processingConsent: true,
      recordingConsent: true,
      ...extras,
    }),
  });
  const payload = await response.json() as Record<string, unknown>;
  return { response, payload };
}

function bearer(token: unknown, json = false) {
  assert.equal(typeof token, "string");
  return {
    authorization: `Bearer ${token}`,
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

test("public assessment start issues scoped credentials and persists the LiveKit session atomically enough for the client journey", async () => {
  const f = await fixture();
  try {
    const { response, payload } = await startConference(f.origin);
    assert.equal(response.status, 200, JSON.stringify(payload));
    assert.equal(payload.provider, "livekit");
    assert.equal(typeof payload.assessmentId, "string");
    assert.equal(typeof payload.sessionKey, "string");
    assert.equal(typeof payload.progressToken, "string");
    assert.equal(typeof payload.resumeToken, "string");
    assert.equal(payload.roomUrl, "wss://livekit.example.test");
    assert.equal(payload.roomName, `assessment-${payload.assessmentId}-${payload.sessionKey}`);
    assert.equal(f.voiceCalls.creates.length, 1);

    const assessment = f.runtime.database.prepare("SELECT status,provider,resumeTokenHash FROM assessments WHERE assessmentId=?").get(payload.assessmentId) as Record<string, unknown>;
    assert.equal(assessment.status, "in_progress");
    assert.equal(assessment.provider, "livekit");
    assert.ok(String(assessment.resumeTokenHash).length > 20);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM assessmentSessions WHERE assessmentId=?").get(payload.assessmentId) as { count: number }).count), 1);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM funnelEvents WHERE assessmentId=? AND name='assessment_started'").get(payload.assessmentId) as { count: number }).count), 1);
  } finally { await f.close(); }
});

test("client progress, status and diagnostics accept only the scoped progress token and preserve redaction/idempotency", async () => {
  const f = await fixture();
  try {
    const { response: started, payload } = await startConference(f.origin);
    assert.equal(started.status, 200, JSON.stringify(payload));
    const assessmentId = String(payload.assessmentId);
    const sessionKey = String(payload.sessionKey);
    const progressToken = payload.progressToken;
    const roomName = String(payload.roomName);

    const unauthorized = await fetch(`${f.origin}/api/assessment/session-status?assessmentId=${assessmentId}&sessionKey=${sessionKey}`);
    assert.equal(unauthorized.status, 401);

    const progressEventId = randomUUID();
    const progress = await fetch(`${f.origin}/api/assessment/progress`, {
      method: "POST",
      headers: bearer(progressToken, true),
      body: JSON.stringify({
        assessmentId,
        sessionKey,
        eventId: progressEventId,
        locale: "es",
        reason: "answer",
        elapsedSeconds: 60,
        updates: [{
          field: "priorityProcess",
          value: "Agendar pacientes",
          evidence: "La prioridad es agendar. password=NoGuardar123",
          status: "confirmed",
          confidence: 0.94,
        }],
      }),
    });
    assert.equal(progress.status, 200, await progress.clone().text());
    const progressBody = await progress.json() as { nextInstruction?: unknown; snapshot?: { fields?: Record<string, { evidence?: string; status?: string }> } };
    assert.equal(typeof progressBody.nextInstruction, "string");
    assert.match(progressBody.snapshot?.fields?.priorityProcess?.evidence ?? "", /\[REDACTED\]/);
    assert.equal(progressBody.snapshot?.fields?.priorityProcess?.status, "pending");

    const duplicateProgress = await fetch(`${f.origin}/api/assessment/progress`, {
      method: "POST",
      headers: bearer(progressToken, true),
      body: JSON.stringify({
        assessmentId,
        sessionKey,
        eventId: progressEventId,
        locale: "es",
        reason: "answer",
        elapsedSeconds: 60,
        updates: [],
      }),
    });
    assert.equal(duplicateProgress.status, 200);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM assessmentEvents WHERE eventId=?").get(progressEventId) as { count: number }).count), 1);

    const mismatchedProgress = await fetch(`${f.origin}/api/assessment/progress`, {
      method: "POST",
      headers: bearer(progressToken, true),
      body: JSON.stringify({
        assessmentId: randomUUID(),
        sessionKey,
        eventId: randomUUID(),
        reason: "answer",
        elapsedSeconds: 1,
      }),
    });
    assert.equal(mismatchedProgress.status, 400);

    const status = await fetch(`${f.origin}/api/assessment/session-status?assessmentId=${assessmentId}&sessionKey=${sessionKey}`, {
      headers: bearer(progressToken),
    });
    assert.equal(status.status, 200, await status.clone().text());
    assert.deepEqual(await status.json(), { status: "in_progress", reason: null, resultAvailable: false });

    const diagnostic = await fetch(`${f.origin}/api/assessment/client-diagnostic`, {
      method: "POST",
      headers: bearer(progressToken, true),
      body: JSON.stringify({
        supportId: payload.supportId,
        event: "audio_playing",
        roomName,
        playbackState: "playing",
        client: "Firefox / Linux",
        sessionKey,
        state: "speaking",
        durationMs: 220,
      }),
    });
    assert.equal(diagnostic.status, 204);
    const diagnosticRow = f.runtime.database.prepare("SELECT source,event,state FROM assessmentTelemetry WHERE assessmentId=? AND source='client'").get(assessmentId) as Record<string, unknown>;
    assert.equal(diagnosticRow.source, "client");
    assert.equal(diagnosticRow.event, "audio_playing");
    assert.equal(diagnosticRow.state, "speaking");

    const roomMismatch = await fetch(`${f.origin}/api/assessment/client-diagnostic`, {
      method: "POST",
      headers: bearer(progressToken, true),
      body: JSON.stringify({
        supportId: payload.supportId,
        event: "audio_playing",
        roomName: `assessment-${randomUUID()}-${sessionKey}`,
        playbackState: "playing",
        client: "Firefox / Linux",
        sessionKey,
      }),
    });
    assert.equal(roomMismatch.status, 403);
  } finally { await f.close(); }
});

test("client fallback completion redacts transcript and makes finalization exactly once", async () => {
  const f = await fixture();
  try {
    const { response: started, payload } = await startConference(f.origin);
    assert.equal(started.status, 200, JSON.stringify(payload));
    const assessmentId = String(payload.assessmentId);
    const sessionKey = String(payload.sessionKey);

    const complete = await fetch(`${f.origin}/api/assessment/complete`, {
      method: "POST",
      headers: bearer(payload.progressToken, true),
      body: JSON.stringify({
        assessmentId,
        sessionKey,
        email: "ana@example.com",
        locale: "es",
        transcript: "Terminamos. api_key=abcdefghijklmnop",
        provider: "livekit",
        durationSeconds: 150,
      }),
    });
    assert.equal(complete.status, 200, await complete.clone().text());
    assert.deepEqual(await complete.json(), { ok: true, reviewPending: true });

    const stored = f.runtime.database.prepare("SELECT status,transcript,reportStatus FROM assessments WHERE assessmentId=?").get(assessmentId) as Record<string, unknown>;
    assert.equal(stored.status, "completed");
    assert.match(String(stored.transcript), /\[REDACTED\]/);
    assert.equal(stored.reportStatus, "review_pending");
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM voiceMetrics WHERE assessmentId=?").get(assessmentId) as { count: number }).count), 1);

    const duplicate = await fetch(`${f.origin}/api/assessment/complete`, {
      method: "POST",
      headers: bearer(payload.progressToken, true),
      body: JSON.stringify({
        assessmentId,
        sessionKey,
        locale: "es",
        transcript: "duplicate",
        provider: "livekit",
        durationSeconds: 151,
      }),
    });
    assert.equal(duplicate.status, 202);
    assert.deepEqual(await duplicate.json(), { ok: true, reviewPending: true, duplicate: true });
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM voiceMetrics WHERE assessmentId=?").get(assessmentId) as { count: number }).count), 1);

    const status = await fetch(`${f.origin}/api/assessment/session-status?assessmentId=${assessmentId}&sessionKey=${sessionKey}`, {
      headers: bearer(payload.progressToken),
    });
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { status: "completed", reason: "client-ended", resultAvailable: true });
  } finally { await f.close(); }
});

test("resume tokens are single-use and a resumed conference preserves the same assessment while rotating session credentials", async () => {
  const f = await fixture();
  try {
    const first = await startConference(f.origin);
    assert.equal(first.response.status, 200, JSON.stringify(first.payload));
    const assessmentId = String(first.payload.assessmentId);
    const firstSessionKey = String(first.payload.sessionKey);

    const resumed = await startConference(f.origin, { resumeToken: first.payload.resumeToken });
    assert.equal(resumed.response.status, 200, JSON.stringify(resumed.payload));
    assert.equal(resumed.payload.assessmentId, assessmentId);
    assert.notEqual(resumed.payload.sessionKey, firstSessionKey);
    assert.notEqual(resumed.payload.resumeToken, first.payload.resumeToken);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM assessments WHERE assessmentId=?").get(assessmentId) as { count: number }).count), 1);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM assessmentSessions WHERE assessmentId=?").get(assessmentId) as { count: number }).count), 2);

    const replay = await startConference(f.origin, { resumeToken: first.payload.resumeToken });
    assert.equal(replay.response.status, 401);
    assert.match(String(replay.payload.error), /invalid|expired|used/i);
  } finally { await f.close(); }
});

test("agent recovery is rate-limited, idempotent and reissues credentials without duplicating the replacement session", async () => {
  const f = await fixture();
  try {
    const started = await startConference(f.origin);
    assert.equal(started.response.status, 200, JSON.stringify(started.payload));
    const assessmentId = String(started.payload.assessmentId);
    const sessionKey = String(started.payload.sessionKey);
    const roomName = String(started.payload.roomName);
    const idempotencyKey = randomUUID();
    const request = () => fetch(`${f.origin}/api/assessment/recover`, {
      method: "POST",
      headers: bearer(started.payload.progressToken, true),
      body: JSON.stringify({ roomName, sessionKey, idempotencyKey }),
    });

    const first = await request();
    assert.equal(first.status, 200, await first.clone().text());
    const firstPayload = await first.json() as Record<string, unknown>;
    assert.equal(firstPayload.provider, "livekit");
    assert.equal(firstPayload.assessmentId, assessmentId);
    assert.notEqual(firstPayload.sessionKey, sessionKey);
    assert.equal(f.voiceCalls.deletes.length, 1);
    assert.equal(f.voiceCalls.creates.length, 2);

    const duplicate = await request();
    assert.equal(duplicate.status, 200, await duplicate.clone().text());
    const duplicatePayload = await duplicate.json() as Record<string, unknown>;
    assert.equal(duplicatePayload.sessionKey, firstPayload.sessionKey);
    assert.equal(f.voiceCalls.creates.length, 2);
    assert.equal(f.voiceCalls.reissues.length, 1);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM assessmentSessions WHERE assessmentId=?").get(assessmentId) as { count: number }).count), 2);

    const limited = await request();
    assert.equal(limited.status, 429);
    assert.equal((await limited.json() as { code: string }).code, "recovery_failed");
  } finally { await f.close(); }
});

test("assessment start fails closed on human verification and leaves no assessment rows behind", async () => {
  const f = await fixture({ turnstileOk: false });
  try {
    const rejected = await startConference(f.origin);
    assert.equal(rejected.response.status, 403);
    assert.equal(rejected.payload.code, "TURNSTILE_REJECTED");
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM assessments").get() as { count: number }).count), 0);
    assert.equal(f.voiceCalls.creates.length, 0);
  } finally { await f.close(); }
});
