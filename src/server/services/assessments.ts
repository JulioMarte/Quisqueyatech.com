import type { Locale } from "../../types/ui";
import { AssessmentInterviewEngine, createAssessmentSnapshot } from "../domain/assessment/engine";
import type { AssessmentSnapshot, ProgressInput, ProgressOutput } from "../domain/assessment/types";
import { AssessmentRepository } from "../db/repositories/assessments";
import type { SQLiteDatabase } from "../db/sqlite";

export interface CreateAssessmentInput {
  assessmentId: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  country: string;
  locale: Locale;
  email: string;
  phone: string;
  processingConsent: boolean;
  recordingConsent: boolean;
  mode: string;
  provider?: string;
  frameworkVersion?: string;
  snapshot?: AssessmentSnapshot;
  createdAt: number;
  audioExpiresAt: number;
  transcriptExpiresAt: number;
  leadExpiresAt: number;
  resumeExpiresAt?: number;
  consentVersion?: string;
}

export interface ProviderSessionInput {
  assessmentId: string;
  sessionKey: string;
  provider: string;
  providerSessionId?: string;
  supportId?: string;
  providerModel?: string;
  providerVoice?: string;
  frameworkVersion: string;
  startedAt: number;
}

function parseJson<T>(value: string | null): T | null {
  return value ? JSON.parse(value) as T : null;
}

export class AssessmentService {
  private readonly repo: AssessmentRepository;
  private readonly engine = new AssessmentInterviewEngine();

  constructor(database: SQLiteDatabase) {
    this.repo = new AssessmentRepository(database);
  }

  create(input: CreateAssessmentInput) {
    if (!input.processingConsent || !input.recordingConsent) throw new Error("CONSENT_REQUIRED");
    return this.repo.database.transaction(() => {
      const existing = this.repo.getByAssessmentId(input.assessmentId);
      if (existing) return existing.id;
      const leadId = this.repo.insertLead(input);
      return this.repo.insertAssessment({ ...input, leadId });
    });
  }

  getState(assessmentId: string) {
    const state = this.repo.getState(assessmentId);
    if (!state) return null;
    return {
      ...state.assessment,
      snapshot: parseJson<AssessmentSnapshot>(state.assessment.snapshot),
      reportDraft: parseJson<unknown>(state.assessment.reportDraft),
      result: parseJson<unknown>(state.assessment.result),
      lead: state.lead,
    };
  }

  setResumeCredential(assessmentId: string, tokenHash: string, expiresAt: number) {
    const item = this.requiredAssessment(assessmentId);
    this.repo.updateAssessment(item.id, { resumeTokenHash: tokenHash, resumeExpiresAt: expiresAt });
  }

  consumeResumeCredential(assessmentId: string, tokenHash: string, now: number) {
    return this.repo.database.transaction(() => {
      const item = this.requiredAssessment(assessmentId);
      if (!item.resumeTokenHash || item.resumeTokenHash !== tokenHash || !item.resumeExpiresAt || item.resumeExpiresAt <= now) return null;
      this.repo.updateAssessment(item.id, { resumeTokenHash: null, resumeExpiresAt: null });
      return this.getState(assessmentId);
    });
  }

  checkRateLimit(key: string, limit: number, windowMs: number, now: number) {
    if (!key || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs <= 0) throw new Error("INVALID_RATE_LIMIT");
    return this.repo.database.transaction(() => this.repo.consumeRateLimit(key, limit, windowMs, now));
  }

  setProviderSession(input: ProviderSessionInput) {
    return this.repo.database.transaction(() => {
      const item = this.requiredAssessment(input.assessmentId);
      const existingSession = this.repo.getSessionByKey(input.sessionKey);
      if (existingSession) {
        if (existingSession.assessmentId !== input.assessmentId) throw new Error("SESSION_KEY_CONFLICT");
        return existingSession.id;
      }
      this.repo.updateAssessment(item.id, {
        provider: input.provider,
        providerSessionId: input.providerSessionId ?? null,
        supportId: input.supportId ?? null,
        providerModel: input.providerModel ?? null,
        providerVoice: input.providerVoice ?? null,
        frameworkVersion: input.frameworkVersion,
        status: "in_progress",
      });
      return this.repo.insertSession({
        sessionKey: input.sessionKey,
        assessmentId: input.assessmentId,
        provider: input.provider,
        providerSessionId: input.providerSessionId,
        supportId: input.supportId,
        model: input.providerModel,
        voice: input.providerVoice,
        frameworkVersion: input.frameworkVersion,
        startedAt: input.startedAt,
      });
    });
  }

  advance(assessmentId: string, input: ProgressInput, alerts: AssessmentSnapshot["alerts"], now: number, sessionKey?: string): ProgressOutput {
    return this.repo.database.transaction(() => {
      const prior = this.repo.getEvent(assessmentId, input.eventId);
      if (prior) return JSON.parse(String(prior.output)) as ProgressOutput;
      const item = this.requiredAssessment(assessmentId);
      const lead = this.repo.getLead(item.leadId);
      if (!lead) throw new Error("Lead not found");
      const current = parseJson<AssessmentSnapshot>(item.snapshot) ?? createAssessmentSnapshot(lead.locale, item.createdAt);
      const output = this.engine.advance(current, input, now);
      output.snapshot.alerts = [...(output.snapshot.alerts || []), ...alerts].slice(-50);
      this.repo.updateAssessment(item.id, {
        snapshot: output.snapshot,
        stage: output.snapshot.stage,
        coverageScore: output.coverageScore,
        completionReason: input.reason,
        status: output.snapshot.complete ? "interview_complete" : input.reason === "interruption" ? "interrupted" : "in_progress",
        reportStatus: output.snapshot.complete ? "pending_draft" : item.reportStatus,
      });
      const fields = output.snapshot.fields;
      const leadPatch: Record<string, unknown> = { updatedAt: now };
      if (fields.name?.status === "confirmed") leadPatch.firstName = fields.name.value;
      if (fields.company?.status === "confirmed") leadPatch.company = fields.company.value;
      if (fields.role?.status === "confirmed") leadPatch.role = fields.role.value;
      if (fields.email?.status === "confirmed") leadPatch.email = fields.email.value;
      if (fields.phone?.status === "confirmed") leadPatch.phone = fields.phone.value.replace(/[\s()-]/g, "");
      this.repo.updateLead(item.leadId, leadPatch);
      this.repo.insertEvent(assessmentId, sessionKey, input, output, now);
      return output;
    });
  }

  getByProviderSession(providerSessionId: string) {
    const session = this.repo.getSessionByProviderSession(providerSessionId);
    if (!session) return null;
    const state = this.getState(session.assessmentId);
    return state ? { ...state, session } : null;
  }

  storeSessionReport(input: {
    sessionKey: string;
    transcript: string;
    report: unknown;
    endedAt: number;
    durationSeconds: number;
    completionReason: string;
    status?: string;
  }) {
    const session = this.repo.getSessionByKey(input.sessionKey);
    if (!session) throw new Error("Session not found");
    this.repo.updateSession(session.id, {
      status: input.status || "ended",
      canonicalTranscript: input.transcript,
      report: input.report,
      endedAt: input.endedAt,
      durationSeconds: input.durationSeconds,
      completionReason: input.completionReason,
    });
    return session.assessmentId;
  }

  getFinalizationState(assessmentId: string, sessionKey: string) {
    const assessment = this.requiredAssessment(assessmentId);
    const session = this.repo.getSessionByKey(sessionKey);
    if (!session || session.assessmentId !== assessmentId) return null;
    return {
      assessmentStatus: assessment.status,
      completionReason: assessment.completionReason,
      sessionStatus: session.status,
    };
  }

  markSessionFinalizing(assessmentId: string, sessionKey: string, completionReason: string, now: number) {
    return this.repo.database.transaction(() => {
      const assessment = this.requiredAssessment(assessmentId);
      const session = this.repo.getSessionByKey(sessionKey);
      if (!session || session.assessmentId !== assessmentId) throw new Error("Session not found");
      if (assessment.status !== "completed") this.repo.updateAssessment(assessment.id, {
        status: "finalizing",
        completionReason,
        finalizationStartedAt: assessment.finalizationStartedAt || now,
      });
      if (session.status !== "ended") this.repo.updateSession(session.id, { status: "finalizing", completionReason });
      return { status: assessment.status === "completed" ? "completed" : "finalizing" };
    });
  }

  beginSessionRecovery(assessmentId: string, sessionKey: string, recoveryKey: string, replacementSessionKey: string) {
    return this.repo.database.transaction(() => {
      const session = this.repo.getSessionByKey(sessionKey);
      if (!session || session.assessmentId !== assessmentId) throw new Error("Session not found");
      if (session.recoveryKey) {
        if (session.recoveryKey !== recoveryKey) throw new Error("Session already recovered");
        return { claimed: false, replacementSessionKey: session.replacementSessionKey };
      }
      this.repo.updateSession(session.id, { status: "recovering", recoveryKey, replacementSessionKey });
      return { claimed: true, replacementSessionKey };
    });
  }

  recordTelemetry(input: Parameters<AssessmentRepository["recordTelemetry"]>[0]) {
    return this.repo.database.transaction(() => this.repo.recordTelemetry(input));
  }

  recordWebhook(input: { eventId: string; provider: string; event: string; payload: string; receivedAt: number }) {
    return this.repo.database.transaction(() => this.repo.claimWebhook(input));
  }

  finishWebhook(eventId: string, success: boolean, error: string | undefined, now: number) {
    this.repo.finishWebhook(eventId, success, error, now);
  }

  claimFinalization(assessmentId: string, now: number) {
    return this.repo.database.transaction(() => {
      const item = this.requiredAssessment(assessmentId);
      if (item.status === "completed") return false;
      if (item.finalizationClaimedAt && item.finalizationClaimedAt > now - 5 * 60_000) return false;
      this.repo.updateAssessment(item.id, {
        status: "finalizing",
        finalizationStartedAt: item.finalizationStartedAt || now,
        finalizationClaimedAt: now,
      });
      return true;
    });
  }

  failFinalization(assessmentId: string, error: string) {
    const item = this.requiredAssessment(assessmentId);
    if (item.status === "finalizing") this.repo.updateAssessment(item.id, {
      status: "finalization_failed",
      completionReason: error.slice(0, 500),
    });
  }

  complete(input: {
    assessmentId: string;
    sessionKey?: string;
    transcript: string;
    provider: string;
    durationSeconds: number;
    result: unknown;
    completionReason?: string;
    completedAt: number;
  }) {
    return this.repo.database.transaction(() => {
      const assessment = this.requiredAssessment(input.assessmentId);
      if (assessment.status === "completed") return false;
      this.repo.updateAssessment(assessment.id, {
        transcript: input.transcript,
        provider: input.provider,
        durationSeconds: input.durationSeconds,
        result: input.result,
        reportDraft: input.result,
        reportStatus: "review_pending",
        reportRevision: (assessment.reportRevision || 0) + 1,
        status: "completed",
        completionReason: input.completionReason || "completed",
        completedAt: input.completedAt,
        finalizationStartedAt: null,
        finalizationClaimedAt: null,
      });
      this.repo.updateLead(assessment.leadId, { status: "assessment_completed", updatedAt: input.completedAt });
      if (input.sessionKey) {
        const session = this.repo.getSessionByKey(input.sessionKey);
        if (session && session.assessmentId === input.assessmentId) this.repo.updateSession(session.id, {
          status: "ended",
          endedAt: input.completedAt,
          durationSeconds: input.durationSeconds,
          completionReason: input.completionReason || "completed",
          canonicalTranscript: input.transcript,
          report: input.result,
        });
      }
      this.repo.insertVoiceMetric({
        assessmentId: input.assessmentId,
        provider: input.provider,
        extractionScore: assessment.coverageScore ?? undefined,
        createdAt: input.completedAt,
      });
      return true;
    });
  }

  private requiredAssessment(assessmentId: string) {
    const item = this.repo.getByAssessmentId(assessmentId);
    if (!item) throw new Error("Assessment not found");
    return item;
  }
}
