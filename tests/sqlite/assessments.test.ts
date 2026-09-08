import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAssessmentSnapshot } from "../../src/server/domain/assessment/engine";
import type { ProgressInput } from "../../src/server/domain/assessment/types";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { AssessmentService } from "../../src/server/services/assessments";

const NOW = 1_800_000_000_000;

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-assessment-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  const service = new AssessmentService(database);
  return {
    database,
    service,
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function createInput(assessmentId = "assessment-1") {
  return {
    assessmentId,
    firstName: "Ana",
    lastName: "Perez",
    company: "Clinica Norte",
    role: "Administradora",
    country: "DO",
    locale: "es" as const,
    email: "ana@example.com",
    phone: "+18095550000",
    processingConsent: true,
    recordingConsent: true,
    mode: "voice",
    provider: "livekit",
    frameworkVersion: "v1",
    snapshot: createAssessmentSnapshot("es", NOW),
    createdAt: NOW,
    audioExpiresAt: NOW + 86_400_000,
    transcriptExpiresAt: NOW + 86_400_000,
    leadExpiresAt: NOW + 365 * 86_400_000,
    resumeExpiresAt: NOW + 3_600_000,
    consentVersion: "2026-09",
  };
}

test("assessment create is consent-gated and idempotent", () => {
  const f = fixture();
  try {
    assert.throws(() => f.service.create({ ...createInput(), recordingConsent: false }), /CONSENT_REQUIRED/);
    const id = f.service.create(createInput());
    assert.equal(f.service.create(createInput()), id);
    const state = f.service.getState("assessment-1");
    assert.equal(state?.status, "started");
    assert.equal(state?.reportStatus, "collecting");
    assert.equal(state?.lead?.status, "assessment_started");
    assert.equal(Number((f.database.prepare("SELECT count(*) AS count FROM assessments").get() as { count: number }).count), 1);
  } finally {
    f.close();
  }
});

test("resume credentials are single-use and expire", () => {
  const f = fixture();
  try {
    f.service.create(createInput());
    f.service.setResumeCredential("assessment-1", "hash-1", NOW + 10_000);
    assert.equal(f.service.consumeResumeCredential("assessment-1", "wrong", NOW), null);
    assert.ok(f.service.consumeResumeCredential("assessment-1", "hash-1", NOW));
    assert.equal(f.service.consumeResumeCredential("assessment-1", "hash-1", NOW), null);

    f.service.setResumeCredential("assessment-1", "expired", NOW - 1);
    assert.equal(f.service.consumeResumeCredential("assessment-1", "expired", NOW), null);
  } finally {
    f.close();
  }
});

test("assessment rate limit resets and enforces the configured window", () => {
  const f = fixture();
  try {
    assert.equal(f.service.checkRateLimit("ip:1", 2, 1_000, NOW), true);
    assert.equal(f.service.checkRateLimit("ip:1", 2, 1_000, NOW + 1), true);
    assert.equal(f.service.checkRateLimit("ip:1", 2, 1_000, NOW + 2), false);
    assert.equal(f.service.checkRateLimit("ip:1", 2, 1_000, NOW + 1_001), true);
  } finally {
    f.close();
  }
});

test("provider session setup and recovery claims are idempotent", () => {
  const f = fixture();
  try {
    f.service.create(createInput());
    const sessionId = f.service.setProviderSession({
      assessmentId: "assessment-1",
      sessionKey: "session-1",
      provider: "livekit",
      providerSessionId: "room-1",
      supportId: "support-1",
      providerModel: "model",
      providerVoice: "voice",
      frameworkVersion: "v1",
      startedAt: NOW,
    });
    assert.equal(f.service.setProviderSession({
      assessmentId: "assessment-1",
      sessionKey: "session-1",
      provider: "livekit",
      frameworkVersion: "v1",
      startedAt: NOW,
    }), sessionId);
    assert.equal(f.service.getByProviderSession("room-1")?.assessmentId, "assessment-1");

    assert.deepEqual(f.service.beginSessionRecovery("assessment-1", "session-1", "recover-1", "session-2"), {
      claimed: true,
      replacementSessionKey: "session-2",
    });
    assert.deepEqual(f.service.beginSessionRecovery("assessment-1", "session-1", "recover-1", "ignored"), {
      claimed: false,
      replacementSessionKey: "session-2",
    });
    assert.throws(() => f.service.beginSessionRecovery("assessment-1", "session-1", "other", "session-3"), /already recovered/);
  } finally {
    f.close();
  }
});

test("advance is event-idempotent and confirmed contact data updates the lead", () => {
  const f = fixture();
  try {
    f.service.create(createInput());
    const input: ProgressInput = {
      assessmentId: "assessment-1",
      eventId: "turn-1",
      reason: "answer",
      elapsedSeconds: 30,
      updates: [
        { field: "email", value: "updated@example.com", evidence: "user confirmed", status: "confirmed", confidence: 1 },
        { field: "phone", value: "+1 (809) 555-1234", evidence: "user confirmed", status: "confirmed", confidence: 1 },
      ],
    };
    const first = f.service.advance("assessment-1", input, [], NOW + 100, "session-1");
    const duplicate = f.service.advance("assessment-1", input, [{ code: "contradiction", message: "must not append", occurredAt: NOW }], NOW + 200, "session-1");
    assert.deepEqual(duplicate, first);
    assert.equal(f.service.getState("assessment-1")?.lead?.email, "updated@example.com");
    assert.equal(f.service.getState("assessment-1")?.lead?.phone, "+18095551234");
    assert.equal(Number((f.database.prepare("SELECT count(*) AS count FROM assessmentEvents").get() as { count: number }).count), 1);
  } finally {
    f.close();
  }
});

test("telemetry and webhook claims preserve Convex idempotency semantics", () => {
  const f = fixture();
  try {
    f.service.create(createInput());
    const telemetry = {
      eventId: "telemetry-1",
      assessmentId: "assessment-1",
      supportId: "support-1",
      sessionKey: "session-1",
      source: "server" as const,
      event: "connected",
      createdAt: NOW,
      expiresAt: NOW + 10_000,
    };
    const firstId = f.service.recordTelemetry(telemetry);
    assert.equal(f.service.recordTelemetry(telemetry), firstId);

    assert.equal(f.service.recordWebhook({ eventId: "webhook-1", provider: "livekit", event: "ended", payload: "{}", receivedAt: NOW }), true);
    assert.equal(f.service.recordWebhook({ eventId: "webhook-1", provider: "livekit", event: "ended", payload: "{}", receivedAt: NOW + 1_000 }), false);
    assert.equal(f.service.recordWebhook({ eventId: "webhook-1", provider: "livekit", event: "ended", payload: "{}", receivedAt: NOW + 6 * 60_000 }), true);
    f.service.finishWebhook("webhook-1", true, undefined, NOW + 6 * 60_000 + 1);
    assert.equal(f.service.recordWebhook({ eventId: "webhook-1", provider: "livekit", event: "ended", payload: "{}", receivedAt: NOW + 12 * 60_000 }), false);
  } finally {
    f.close();
  }
});

test("finalization claim is leased and completion is exactly-once", () => {
  const f = fixture();
  try {
    f.service.create(createInput());
    f.service.setProviderSession({
      assessmentId: "assessment-1",
      sessionKey: "session-1",
      provider: "livekit",
      frameworkVersion: "v1",
      startedAt: NOW,
    });
    assert.equal(f.service.claimFinalization("assessment-1", NOW + 100), true);
    assert.equal(f.service.claimFinalization("assessment-1", NOW + 200), false);
    assert.equal(f.service.complete({
      assessmentId: "assessment-1",
      sessionKey: "session-1",
      transcript: "canonical transcript",
      provider: "livekit",
      durationSeconds: 300,
      result: { summary: "done" },
      completedAt: NOW + 1_000,
    }), true);
    assert.equal(f.service.complete({
      assessmentId: "assessment-1",
      sessionKey: "session-1",
      transcript: "should not overwrite",
      provider: "livekit",
      durationSeconds: 999,
      result: { summary: "duplicate" },
      completedAt: NOW + 2_000,
    }), false);
    const state = f.service.getState("assessment-1");
    assert.equal(state?.status, "completed");
    assert.equal(state?.lead?.status, "assessment_completed");
    assert.deepEqual(state?.result, { summary: "done" });
    assert.equal(Number((f.database.prepare("SELECT count(*) AS count FROM voiceMetrics").get() as { count: number }).count), 1);
  } finally {
    f.close();
  }
});
