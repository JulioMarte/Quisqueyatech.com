import assert from "node:assert/strict";
import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiRuntime } from "../../src/server/api";
import { createAssessmentSnapshot } from "../../src/server/domain/assessment/engine";
import { AssessmentService } from "../../src/server/services/assessments";
import { SettingsService } from "../../src/server/services/settings";

const AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
const ADMIN_SECRET = "test-admin-api-secret-0123456789abcdef";
const WORKER_SECRET = "test-assessment-worker-secret-0123456789abcdef";
const ENCRYPTION_KEY = "11".repeat(32);

function encryptSetting(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-assessment-worker-api-"));
  const databasePath = join(directory, "test.sqlite");
  const previousEncryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
  process.env.CONFIG_ENCRYPTION_KEY = ENCRYPTION_KEY;
  const runtime = createApiRuntime({
    databasePath,
    authSecret: AUTH_SECRET,
    authBaseURL: "http://127.0.0.1",
    adminApiSecret: ADMIN_SECRET,
    assessmentWorkerSecret: WORKER_SECRET,
  });
  const assessments = new AssessmentService(runtime.database);
  const settings = new SettingsService(runtime.database);
  settings.save({
    actorEmail: "ci@quisqueyatech.com",
    config: {
      geminiLiveModel: "gemini-3.1-flash-live-preview",
      geminiLiveVoice: "Aoede",
    },
    secrets: [{
      key: "geminiApiKey",
      ciphertext: encryptSetting("ci-gemini-api-key"),
      lastFour: "-key",
      version: 1,
    }],
  });

  const assessmentId = randomUUID();
  const sessionKey = randomUUID();
  const supportId = randomUUID();
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
    mode: "conference",
    provider: "livekit",
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
    provider: "livekit",
    providerSessionId: `room-${assessmentId}`,
    supportId,
    providerModel: "gemini-3.1-flash-live-preview",
    providerVoice: "Aoede",
    frameworkVersion: "2026-07-v1",
    startedAt: now,
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
    assessments,
    assessmentId,
    sessionKey,
    supportId,
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

function workerHeaders(json = false) {
  return {
    authorization: `Bearer ${WORKER_SECRET}`,
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

test("assessment worker API preserves the deployed LiveKit contract end to end", async () => {
  const f = await fixture();
  try {
    const unauthorized = await fetch(`${f.origin}/api/assessment/worker-config`);
    assert.equal(unauthorized.status, 401);

    const config = await fetch(`${f.origin}/api/assessment/worker-config`, { headers: workerHeaders() });
    assert.equal(config.status, 200, await config.clone().text());
    const configBody = await config.json() as Record<string, unknown>;
    assert.equal(configBody.geminiApiKey, "ci-gemini-api-key");
    assert.equal(configBody.model, "gemini-3.1-flash-live-preview");
    assert.equal(configBody.voice, "Aoede");
    assert.equal(configBody.temperature, 0.3);

    const prompt = await fetch(`${f.origin}/api/assessment/prompt?assessmentId=${f.assessmentId}`, { headers: workerHeaders() });
    assert.equal(prompt.status, 200, await prompt.clone().text());
    const promptBody = await prompt.json() as { prompt: string };
    assert.match(promptBody.prompt, /July/);
    assert.match(promptBody.prompt, /Ana/);

    const eventId = randomUUID();
    const progressBody = {
      assessmentId: f.assessmentId,
      sessionKey: f.sessionKey,
      eventId,
      locale: "es",
      reason: "answer",
      elapsedSeconds: 45,
      updates: [{
        field: "priorityProcess",
        value: "Agendar pacientes",
        evidence: "La prioridad es agendar pacientes; api_key=abcdefghijklmnop",
        status: "confirmed",
        confidence: 0.95,
      }],
    };
    const progress = await fetch(`${f.origin}/api/assessment/progress`, {
      method: "POST",
      headers: workerHeaders(true),
      body: JSON.stringify(progressBody),
    });
    assert.equal(progress.status, 200, await progress.clone().text());
    const progressResult = await progress.json() as { nextInstruction?: unknown; snapshot?: { fields?: Record<string, { evidence?: string; status?: string }> } };
    assert.equal(typeof progressResult.nextInstruction, "string");
    assert.match(progressResult.snapshot?.fields?.priorityProcess?.evidence ?? "", /\[REDACTED\]/);
    assert.equal(progressResult.snapshot?.fields?.priorityProcess?.status, "pending");

    const duplicateProgress = await fetch(`${f.origin}/api/assessment/progress`, {
      method: "POST",
      headers: workerHeaders(true),
      body: JSON.stringify(progressBody),
    });
    assert.equal(duplicateProgress.status, 200);
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM assessmentEvents WHERE eventId=?").get(eventId) as { count: number }).count), 1);

    const telemetryId = randomUUID();
    const telemetry = await fetch(`${f.origin}/api/assessment/worker-diagnostic`, {
      method: "POST",
      headers: workerHeaders(true),
      body: JSON.stringify({
        eventId: telemetryId,
        assessmentId: f.assessmentId,
        supportId: f.supportId,
        sessionKey: f.sessionKey,
        event: "agent_ready",
        state: "ready",
        durationMs: 123,
      }),
    });
    assert.equal(telemetry.status, 204);
    const telemetryRow = f.runtime.database.prepare("SELECT source,event,expiresAt,createdAt FROM assessmentTelemetry WHERE eventId=?").get(telemetryId) as Record<string, unknown>;
    assert.equal(telemetryRow.source, "worker");
    assert.equal(telemetryRow.event, "agent_ready");
    assert.ok(Number(telemetryRow.expiresAt) - Number(telemetryRow.createdAt) >= 29 * 86_400_000);

    const finalizing = await fetch(`${f.origin}/api/assessment/session-status`, {
      method: "POST",
      headers: workerHeaders(true),
      body: JSON.stringify({
        assessmentId: f.assessmentId,
        sessionKey: f.sessionKey,
        completionReason: "assessment-completed",
      }),
    });
    assert.equal(finalizing.status, 200, await finalizing.clone().text());
    assert.deepEqual(await finalizing.json(), { status: "finalizing" });

    const finalize = await fetch(`${f.origin}/api/assessment/provider-finalize`, {
      method: "POST",
      headers: workerHeaders(true),
      body: JSON.stringify({
        assessmentId: f.assessmentId,
        sessionKey: f.sessionKey,
        provider: "livekit",
        transcript: "El proceso es manual. password=SuperSecret123",
        sessionReport: { chatHistory: [] },
        durationSeconds: 180,
        completionReason: "assessment-completed",
        finalizeAssessment: true,
      }),
    });
    assert.equal(finalize.status, 200, await finalize.clone().text());
    assert.deepEqual(await finalize.json(), { ok: true });

    const state = f.assessments.getState(f.assessmentId);
    assert.equal(state?.status, "completed");
    assert.match(String(state?.transcript), /\[REDACTED\]/);
    assert.equal(state?.reportStatus, "review_pending");

    const duplicateFinalize = await fetch(`${f.origin}/api/assessment/provider-finalize`, {
      method: "POST",
      headers: workerHeaders(true),
      body: JSON.stringify({
        assessmentId: f.assessmentId,
        sessionKey: f.sessionKey,
        provider: "livekit",
        transcript: "duplicate",
        sessionReport: {},
        durationSeconds: 181,
        completionReason: "assessment-completed",
        finalizeAssessment: true,
      }),
    });
    assert.equal(duplicateFinalize.status, 200);
    assert.deepEqual(await duplicateFinalize.json(), { ok: true, duplicate: true });
    assert.equal(Number((f.runtime.database.prepare("SELECT count(*) AS count FROM voiceMetrics WHERE assessmentId=?").get(f.assessmentId) as { count: number }).count), 1);
  } finally {
    await f.close();
  }
});
