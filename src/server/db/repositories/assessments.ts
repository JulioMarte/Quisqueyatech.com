import { randomUUID } from "node:crypto";
import type { SQLInputValue } from "node:sqlite";
import type { Locale } from "../../../types/ui";
import type { AssessmentSnapshot, ProgressInput, ProgressOutput } from "../../domain/assessment/types";
import { getDatabase, type SQLiteDatabase } from "../sqlite";

function sqlValue(value: unknown): SQLInputValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  if (value instanceof Uint8Array) return value;
  throw new TypeError(`Unsupported SQLite value: ${typeof value}`);
}

export interface AssessmentRow extends Record<string, unknown> {
  id: string; assessmentId: string; leadId: string; provider: string | null;
  providerSessionId: string | null; supportId: string | null; providerModel: string | null;
  providerVoice: string | null; frameworkVersion: string | null; mode: string; status: string;
  stage: string | null; coverageScore: number | null; snapshot: string | null;
  completionReason: string | null; resumeTokenHash: string | null; resumeExpiresAt: number | null;
  finalizationStartedAt: number | null; finalizationClaimedAt: number | null;
  reportDraft: string | null; reportStatus: string | null; reportRevision: number | null;
  recordingConsentAt: number; consentVersion: string | null; audioExpiresAt: number;
  transcript: string | null; transcriptExpiresAt: number; result: string | null;
  durationSeconds: number | null; createdAt: number; completedAt: number | null;
}

export interface AssessmentSessionRow extends Record<string, unknown> {
  id: string; sessionKey: string; assessmentId: string; provider: string;
  providerSessionId: string | null; supportId: string | null; model: string | null; voice: string | null;
  frameworkVersion: string; status: string; startedAt: number; endedAt: number | null;
  durationSeconds: number | null; completionReason: string | null; recoveryKey: string | null;
  replacementSessionKey: string | null; canonicalTranscript: string | null; report: string | null;
}

export interface AssessmentLeadRow extends Record<string, unknown> {
  id: string; assessmentId: string | null; firstName: string; lastName: string;
  company: string | null; role: string | null; country: string; locale: Locale;
  email: string; phone: string; source: string; status: string; processingConsentAt: number;
  leadExpiresAt: number; createdAt: number; updatedAt: number;
}

export class AssessmentRepository {
  constructor(readonly database: SQLiteDatabase = getDatabase()) {}

  getByAssessmentId(assessmentId: string) {
    return this.database.prepare("SELECT * FROM assessments WHERE assessmentId=? LIMIT 1").get(assessmentId) as AssessmentRow | undefined;
  }

  getLead(id: string) {
    return this.database.prepare("SELECT * FROM leads WHERE id=? LIMIT 1").get(id) as AssessmentLeadRow | undefined;
  }

  getState(assessmentId: string) {
    const assessment = this.getByAssessmentId(assessmentId);
    return assessment ? { assessment, lead: this.getLead(assessment.leadId) ?? null } : null;
  }

  insertLead(input: {
    assessmentId: string; firstName: string; lastName: string; company: string; role: string;
    country: string; locale: Locale; email: string; phone: string; createdAt: number; leadExpiresAt: number;
  }) {
    const id = randomUUID();
    this.database.prepare(`INSERT INTO leads(
      id,assessmentId,firstName,lastName,company,role,country,locale,email,phone,
      source,status,processingConsentAt,leadExpiresAt,createdAt,updatedAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,'voice-assessment','assessment_started',?,?,?,?)`).run(
      id, input.assessmentId, input.firstName, input.lastName, input.company, input.role, input.country,
      input.locale, input.email, input.phone, input.createdAt, input.leadExpiresAt, input.createdAt, input.createdAt,
    );
    return id;
  }

  insertAssessment(input: {
    assessmentId: string; leadId: string; mode: string; provider?: string; frameworkVersion?: string;
    snapshot?: AssessmentSnapshot; createdAt: number; audioExpiresAt: number; transcriptExpiresAt: number;
    resumeExpiresAt?: number; consentVersion?: string;
  }) {
    const id = randomUUID();
    this.database.prepare(`INSERT INTO assessments(
      id,assessmentId,leadId,provider,frameworkVersion,mode,status,stage,coverageScore,snapshot,
      reportStatus,reportRevision,recordingConsentAt,consentVersion,audioExpiresAt,transcriptExpiresAt,resumeExpiresAt,createdAt
    ) VALUES (?,?,?,?,?,?,'started',?,?,?,'collecting',0,?,?,?,?,?,?)`).run(
      id, input.assessmentId, input.leadId, input.provider ?? null, input.frameworkVersion ?? null, input.mode,
      input.snapshot?.stage ?? null, input.snapshot?.coverageScore ?? 0,
      input.snapshot ? JSON.stringify(input.snapshot) : null, input.createdAt, input.consentVersion ?? null,
      input.audioExpiresAt, input.transcriptExpiresAt, input.resumeExpiresAt ?? null, input.createdAt,
    );
    return id;
  }

  updateAssessment(id: string, values: Record<string, unknown>) {
    this.update("assessments", id, values, new Set([
      "provider","providerSessionId","supportId","providerModel","providerVoice","frameworkVersion","status","stage",
      "coverageScore","snapshot","completionReason","resumeTokenHash","resumeExpiresAt","finalizationStartedAt",
      "finalizationClaimedAt","reportDraft","reportStatus","reportRevision","transcript","result","durationSeconds","completedAt",
    ]), new Set(["snapshot","reportDraft","result"]));
  }

  updateLead(id: string, values: Record<string, unknown>) {
    this.update("leads", id, values, new Set(["firstName","company","role","email","phone","status","updatedAt"]));
  }

  private update(table: string, id: string, values: Record<string, unknown>, allowed: Set<string>, jsonFields = new Set<string>()) {
    const entries = Object.entries(values).filter(([key, value]) => allowed.has(key) && value !== undefined);
    if (!entries.length) return;
    const assignments = entries.map(([key]) => `"${key}"=?`).join(",");
    const params: SQLInputValue[] = entries.map(([key, value]) =>
      sqlValue(jsonFields.has(key) && value !== null && typeof value !== "string" ? JSON.stringify(value) : value),
    );
    this.database.prepare(`UPDATE ${table} SET ${assignments} WHERE id=?`).run(...params, id);
  }

  getSessionByKey(sessionKey: string) {
    return this.database.prepare("SELECT * FROM assessmentSessions WHERE sessionKey=? LIMIT 1").get(sessionKey) as AssessmentSessionRow | undefined;
  }

  getSessionByProviderSession(providerSessionId: string) {
    return this.database.prepare("SELECT * FROM assessmentSessions WHERE providerSessionId=? LIMIT 1").get(providerSessionId) as AssessmentSessionRow | undefined;
  }

  insertSession(input: {
    sessionKey: string; assessmentId: string; provider: string; providerSessionId?: string; supportId?: string;
    model?: string; voice?: string; frameworkVersion: string; startedAt: number;
  }) {
    const id = randomUUID();
    this.database.prepare(`INSERT INTO assessmentSessions(
      id,sessionKey,assessmentId,provider,providerSessionId,supportId,model,voice,frameworkVersion,status,startedAt
    ) VALUES (?,?,?,?,?,?,?,?,?,'active',?)`).run(
      id, input.sessionKey, input.assessmentId, input.provider, input.providerSessionId ?? null, input.supportId ?? null,
      input.model ?? null, input.voice ?? null, input.frameworkVersion, input.startedAt,
    );
    return id;
  }

  updateSession(id: string, values: Record<string, unknown>) {
    this.update("assessmentSessions", id, values, new Set([
      "status","endedAt","durationSeconds","completionReason","recoveryKey","replacementSessionKey","canonicalTranscript","report",
    ]), new Set(["report"]));
  }

  getEvent(assessmentId: string, eventId: string) {
    return this.database.prepare("SELECT * FROM assessmentEvents WHERE assessmentId=? AND eventId=? LIMIT 1").get(assessmentId, eventId) as Record<string, unknown> | undefined;
  }

  insertEvent(assessmentId: string, sessionKey: string | undefined, input: ProgressInput, output: ProgressOutput, now: number) {
    this.database.prepare(`INSERT INTO assessmentEvents(id,assessmentId,eventId,sessionKey,reason,input,output,createdAt)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      randomUUID(), assessmentId, input.eventId, sessionKey ?? null, input.reason, JSON.stringify(input), JSON.stringify(output), now,
    );
  }

  consumeRateLimit(key: string, limit: number, windowMs: number, now: number) {
    const row = this.database.prepare("SELECT id,count,resetAt FROM assessmentRateLimits WHERE key=? LIMIT 1").get(key) as
      { id: string; count: number; resetAt: number } | undefined;
    if (!row || row.resetAt <= now) {
      if (row) this.database.prepare("UPDATE assessmentRateLimits SET count=1,resetAt=? WHERE id=?").run(now + windowMs, row.id);
      else this.database.prepare("INSERT INTO assessmentRateLimits(id,key,count,resetAt) VALUES (?,?,1,?)").run(randomUUID(), key, now + windowMs);
      return true;
    }
    if (row.count >= limit) return false;
    this.database.prepare("UPDATE assessmentRateLimits SET count=count+1 WHERE id=?").run(row.id);
    return true;
  }

  recordTelemetry(input: {
    eventId: string; assessmentId: string; supportId: string; sessionKey: string;
    source: "worker" | "client" | "server"; event: string; turnId?: string; state?: string; code?: string;
    durationMs?: number; recoverable?: boolean; createdAt: number; expiresAt: number;
  }) {
    const existing = this.database.prepare("SELECT id FROM assessmentTelemetry WHERE eventId=? LIMIT 1").get(input.eventId) as { id: string } | undefined;
    if (existing) return existing.id;
    const id = randomUUID();
    this.database.prepare(`INSERT INTO assessmentTelemetry(
      id,eventId,assessmentId,supportId,sessionKey,source,event,turnId,state,code,durationMs,recoverable,createdAt,expiresAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id,input.eventId,input.assessmentId,input.supportId,input.sessionKey,input.source,input.event,input.turnId ?? null,
      input.state ?? null,input.code ?? null,input.durationMs ?? null,input.recoverable === undefined ? null : input.recoverable ? 1 : 0,
      input.createdAt,input.expiresAt,
    );
    return id;
  }

  claimWebhook(input: { eventId: string; provider: string; event: string; payload: string; receivedAt: number }) {
    const row = this.database.prepare("SELECT id,status,receivedAt FROM webhookEvents WHERE eventId=? LIMIT 1").get(input.eventId) as
      { id: string; status: string; receivedAt: number } | undefined;
    if (row?.status === "processed" || (row?.status === "processing" && row.receivedAt > input.receivedAt - 5 * 60_000)) return false;
    if (row) {
      this.database.prepare("UPDATE webhookEvents SET status='processing',attempts=attempts+1,error=NULL,receivedAt=? WHERE id=?").run(input.receivedAt, row.id);
      return true;
    }
    this.database.prepare(`INSERT INTO webhookEvents(id,eventId,provider,event,payload,status,attempts,receivedAt)
      VALUES (?,?,?,?,?,'processing',1,?)`).run(randomUUID(), input.eventId, input.provider, input.event, input.payload, input.receivedAt);
    return true;
  }

  finishWebhook(eventId: string, success: boolean, error: string | undefined, now: number) {
    this.database.prepare("UPDATE webhookEvents SET status=?,error=?,processedAt=? WHERE eventId=?").run(
      success ? "processed" : "failed", error ?? null, success ? now : null, eventId,
    );
  }

  insertVoiceMetric(input: { assessmentId: string; provider: string; extractionScore?: number; createdAt: number }) {
    this.database.prepare(`INSERT INTO voiceMetrics(id,assessmentId,provider,completion,extractionScore,createdAt)
      VALUES (?,?,?,1,?,?)`).run(randomUUID(), input.assessmentId, input.provider, input.extractionScore ?? null, input.createdAt);
  }
}
