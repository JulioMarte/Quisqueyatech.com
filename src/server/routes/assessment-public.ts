import { randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createAssessmentSnapshot } from "../domain/assessment/engine";
import type { AssessmentEvidence, AssessmentFieldKey, ProgressInput, ProgressReason } from "../domain/assessment/types";
import type { AdminSecurityService } from "../services/admin-security";
import {
  DEFAULT_GEMINI_LIVE_MODEL,
  DEFAULT_GEMINI_LIVE_VOICE,
  INTERVIEW_FRAMEWORK_VERSION,
  TELEMETRY_RETENTION_MS,
  buildAssessmentReport,
  enforceAssessmentDataPolicy,
  redactSensitiveText,
} from "../services/assessment-runtime";
import type { AssessmentTokenService } from "../services/assessment-tokens";
import type { AssessmentVoiceRuntime } from "../services/assessment-voice";
import { AssessmentVoiceError } from "../services/assessment-voice";
import type { AssessmentService } from "../services/assessments";
import type { FunnelService } from "../services/funnel";
import type { SettingsService } from "../services/settings";
import type { TurnstileAction, TurnstileResult } from "../services/turnstile";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELD_KEYS = new Set<AssessmentFieldKey>([
  "name", "company", "role", "email", "phone", "businessContext", "candidateProcesses",
  "priorityProcess", "trigger", "outcome", "owners", "tools", "steps", "exceptions", "volume",
  "manualWork", "pain", "impact", "desiredOutcome", "successMetric", "constraints", "validators",
]);
const REASONS = new Set<ProgressReason>(["answer", "correction", "time-threshold", "interruption", "close"]);
const TELEMETRY_EVENTS = new Set([
  "audio_blocked", "audio_unlocked", "track_subscribed", "track_unsubscribed", "play_rejected",
  "audio_playing", "audio_failed", "room_reconnecting", "room_reconnected", "room_disconnected",
  "agent_metadata", "turn_user_final", "turn_response", "turn_stalled", "turn_recovered", "recovery_required",
  "recovery_started", "session_recovered", "recovery_failed", "agent_state", "user_state", "speech_created",
  "metrics_collected", "tool_started", "tool_completed", "tool_failed", "model_error", "session_closed",
  "agent_initializing", "agent_ready", "finalization_started", "finalization_completed",
]);
const PLAYBACK_STATES = new Set(["unknown", "blocked", "ready", "playing", "failed"]);

type AssessmentLocale = "es" | "en";

export interface AssessmentPublicRouteOptions {
  workerSecret: string;
  tokens: AssessmentTokenService;
  assessments: AssessmentService;
  settings: SettingsService;
  security: AdminSecurityService;
  funnel: FunnelService;
  voice: AssessmentVoiceRuntime;
  requestIp: (request: IncomingMessage) => string;
  verifyTurnstile: (token: string | undefined, ip: string | undefined, action: TurnstileAction) => Promise<TurnstileResult>;
}

function json(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(payload));
  response.setHeader("Cache-Control", headers["Cache-Control"] ?? "no-store");
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.end(payload);
}

function bearer(request: IncomingMessage) {
  const authorization = request.headers.authorization ?? "";
  return authorization.replace(/^Bearer\s+/i, "").trim();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

async function readJson(request: IncomingMessage, limit = 512_000) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > limit) throw new Error("BODY_TOO_LARGE");
    chunks.push(value);
  }
  if (!chunks.length) throw new Error("INVALID_JSON");
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") throw error;
    throw new Error("INVALID_JSON");
  }
}

function requiredUuid(value: unknown, key: string) {
  if (typeof value !== "string" || !UUID.test(value)) throw new Error(`INVALID:${key}`);
  return value;
}

function optionalString(value: unknown, max: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > max) throw new Error("INVALID:string");
  return value;
}

function parseUpdates(value: unknown): AssessmentEvidence[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 30) throw new Error("INVALID:updates");
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("INVALID:updates");
    const input = item as Record<string, unknown>;
    if (typeof input.field !== "string" || !FIELD_KEYS.has(input.field as AssessmentFieldKey)) throw new Error("INVALID:field");
    if (typeof input.value !== "string" || !input.value.trim() || input.value.length > 2_000) throw new Error("INVALID:value");
    if (typeof input.evidence !== "string" || !input.evidence.trim() || input.evidence.length > 4_000) throw new Error("INVALID:evidence");
    if (!["confirmed", "estimated", "inferred", "pending"].includes(String(input.status))) throw new Error("INVALID:status");
    if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
      throw new Error("INVALID:confidence");
    }
    return {
      field: input.field as AssessmentFieldKey,
      value: input.value.trim(),
      evidence: input.evidence.trim(),
      status: input.status as AssessmentEvidence["status"],
      confidence: input.confidence,
    };
  });
}

function runtimeModel(settings: SettingsService) {
  const config = settings.internalRuntime().config;
  return {
    model: String(config.geminiLiveModel || DEFAULT_GEMINI_LIVE_MODEL),
    voice: String(config.geminiLiveVoice || DEFAULT_GEMINI_LIVE_VOICE),
  };
}

function readiness(settings: SettingsService, workerSecret: string) {
  const runtime = settings.internalRuntime();
  const missing: string[] = [];
  if (!String(runtime.config.livekitUrl || "").trim()) missing.push("livekitUrl");
  if (!runtime.secrets.livekitApiKey) missing.push("livekitApiKey");
  if (!runtime.secrets.livekitApiSecret) missing.push("livekitApiSecret");
  if (!runtime.secrets.geminiApiKey) missing.push("geminiApiKey");
  if (!workerSecret.trim()) missing.push("ASSESSMENT_WORKER_SECRET");
  return { ready: missing.length === 0, missing };
}

function publicFinalizationState(state: { assessmentStatus: string; completionReason?: string | null; sessionStatus: string }) {
  const allowed = new Set(["in_progress", "finalizing", "completed", "interrupted", "finalization_failed"]);
  const status = state.assessmentStatus === "completed" || state.assessmentStatus === "finalizing" || state.assessmentStatus === "finalization_failed"
    ? state.assessmentStatus
    : state.sessionStatus === "interrupted" || state.sessionStatus === "recovering"
      ? "interrupted"
      : allowed.has(state.assessmentStatus) ? state.assessmentStatus : "in_progress";
  const publicReasons = new Set(["assessment-completed", "user-requested-end", "hard-time-limit", "client-ended", "close"]);
  return {
    status,
    reason: status === "finalization_failed"
      ? "FINALIZATION_FAILED"
      : state.completionReason && publicReasons.has(state.completionReason) ? state.completionReason : null,
    resultAvailable: status === "completed",
  };
}

function progressAuthority(request: IncomingMessage, options: AssessmentPublicRouteOptions, assessmentId: string) {
  const token = bearer(request);
  if (safeEqual(options.workerSecret, token)) return { worker: true, token: null };
  const verified = options.tokens.verify(token, "progress");
  if (!verified) return null;
  return { worker: false, token: verified, matches: verified.assessmentId === assessmentId };
}

function parseConferenceStart(body: Record<string, unknown>): {
  locale: AssessmentLocale;
  visitorId?: string;
  turnstileToken?: string;
  resumeToken?: string;
} {
  if (body.mode !== "conference") throw new Error("INVALID:mode");
  if (body.locale !== "es" && body.locale !== "en") throw new Error("INVALID:locale");
  if (body.processingConsent !== true || body.recordingConsent !== true) throw new Error("INVALID:consent");
  if (body.visitorId !== undefined && (typeof body.visitorId !== "string" || !UUID.test(body.visitorId))) throw new Error("INVALID:visitorId");
  if (body.turnstileToken !== undefined && typeof body.turnstileToken !== "string") throw new Error("INVALID:turnstileToken");
  if (body.resumeToken !== undefined && typeof body.resumeToken !== "string") throw new Error("INVALID:resumeToken");
  return {
    locale: body.locale,
    visitorId: body.visitorId as string | undefined,
    turnstileToken: body.turnstileToken as string | undefined,
    resumeToken: body.resumeToken as string | undefined,
  };
}

function parseClientDiagnostic(body: Record<string, unknown>) {
  const supportId = requiredUuid(body.supportId, "supportId");
  const sessionKey = requiredUuid(body.sessionKey, "sessionKey");
  if (typeof body.event !== "string" || !TELEMETRY_EVENTS.has(body.event)) throw new Error("INVALID:event");
  if (typeof body.roomName !== "string" || body.roomName.length < 10 || body.roomName.length > 180) throw new Error("INVALID:roomName");
  if (typeof body.playbackState !== "string" || !PLAYBACK_STATES.has(body.playbackState)) throw new Error("INVALID:playbackState");
  if (typeof body.client !== "string" || body.client.length < 1 || body.client.length > 180) throw new Error("INVALID:client");
  const turnId = optionalString(body.turnId, 80);
  const state = optionalString(body.state, 80);
  const code = optionalString(body.code, 80);
  if (body.durationMs !== undefined && (
    typeof body.durationMs !== "number" || !Number.isFinite(body.durationMs) || body.durationMs < 0 || body.durationMs > 120_000
  )) throw new Error("INVALID:durationMs");
  return {
    supportId,
    sessionKey,
    event: body.event,
    roomName: body.roomName,
    playbackState: body.playbackState,
    client: body.client,
    turnId,
    state,
    code,
    durationMs: body.durationMs as number | undefined,
  };
}

function recordServerRecoveryEvent(
  options: AssessmentPublicRouteOptions,
  assessmentId: string,
  supportId: string,
  sessionKey: string,
  event: "recovery_started" | "session_recovered" | "recovery_failed",
  code?: string,
) {
  const now = Date.now();
  options.assessments.recordTelemetry({
    eventId: randomUUID(),
    assessmentId,
    supportId,
    sessionKey,
    source: "server",
    event,
    code,
    createdAt: now,
    expiresAt: now + TELEMETRY_RETENTION_MS,
  });
}

export function createAssessmentPublicRoutes(options: AssessmentPublicRouteOptions) {
  return async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
    if (!url.pathname.startsWith("/api/assessment/")) return false;

    if (url.pathname === "/api/assessment/start" && request.method === "POST") {
      try {
        const body = await readJson(request, 32_000);
        const parsed = parseConferenceStart(body);
        const ip = options.requestIp(request);
        const edge = options.security.checkSecurityRateLimit(`assessment-edge:${ip}`, 100, 10 * 60_000);
        if (!edge.allowed) {
          response.setHeader("Retry-After", String(edge.retryAfter));
          json(response, 429, { error: "Too many requests from this network. Please try again shortly.", code: "RATE_LIMITED", retryAfter: edge.retryAfter });
          return true;
        }
        const ready = readiness(options.settings, options.workerSecret);
        if (!ready.ready) {
          json(response, 503, { error: "LiveKit is not configured", code: "LIVEKIT_NOT_CONFIGURED", issues: ready.missing });
          return true;
        }
        const human = await options.verifyTurnstile(parsed.turnstileToken, ip, "assessment_start");
        if (!human.ok) {
          json(response, human.code === "TURNSTILE_UNAVAILABLE" ? 503 : 403, {
            error: "We could not confirm human verification. Please try again.",
            code: human.code,
            supportId: human.supportId,
          });
          return true;
        }
        const limiter = options.security.checkSecurityRateLimit(
          `assessment-start:${ip}:${parsed.visitorId || "legacy"}`,
          12,
          60 * 60_000,
        );
        if (!limiter.allowed) {
          response.setHeader("Retry-After", String(limiter.retryAfter));
          json(response, 429, { error: "This browser has reached its conference limit. Please try again later.", code: "RATE_LIMITED", retryAfter: limiter.retryAfter });
          return true;
        }

        let previous: ReturnType<AssessmentService["getState"]> = null;
        let assessmentId: string = randomUUID();
        if (parsed.resumeToken) {
          const verified = options.tokens.verify(parsed.resumeToken, "resume");
          if (!verified) {
            json(response, 401, { error: "This resume link is invalid, expired, or has already been used." });
            return true;
          }
          assessmentId = verified.assessmentId;
          previous = options.assessments.consumeResumeCredential(assessmentId, options.tokens.hash(parsed.resumeToken), Date.now());
          if (!previous) {
            json(response, 401, { error: "This resume link is invalid, expired, or has already been used." });
            return true;
          }
        }

        const now = Date.now();
        const locale: AssessmentLocale = previous?.lead?.locale === "en" ? "en" : parsed.locale;
        const temporaryId = randomUUID();
        options.assessments.create({
          assessmentId,
          firstName: previous?.lead?.firstName || (locale === "es" ? "Visitante" : "Guest"),
          lastName: previous?.lead?.lastName || "Web",
          company: previous?.lead?.company || "No informado",
          role: previous?.lead?.role || "No informado",
          country: previous?.lead?.country || "No informado",
          locale,
          email: previous?.lead?.email || `voice-${temporaryId}@anonymous.invalid`,
          phone: previous?.lead?.phone || "+10000000000",
          processingConsent: true,
          recordingConsent: true,
          mode: "now",
          provider: "livekit",
          frameworkVersion: INTERVIEW_FRAMEWORK_VERSION,
          snapshot: previous?.snapshot ?? createAssessmentSnapshot(locale, now),
          createdAt: now,
          audioExpiresAt: now + 30 * 86_400_000,
          transcriptExpiresAt: now + 90 * 86_400_000,
          leadExpiresAt: now + 365 * 86_400_000,
          resumeExpiresAt: now + 24 * 60 * 60_000,
          consentVersion: "voice-assessment-2026-07-v1",
        });

        const progressToken = options.tokens.progress(assessmentId);
        const sessionKey = randomUUID();
        const resumeSummary = previous?.snapshot ? JSON.stringify({
          fields: previous.snapshot.fields,
          essentialMissing: previous.snapshot.essentialMissing,
          coverageScore: previous.snapshot.coverageScore,
        }) : undefined;
        const session = await options.voice.createSession({
          assessmentId,
          sessionKey,
          locale,
          name: previous?.lead?.firstName || (locale === "es" ? "Visitante" : "Guest"),
          resumeSummary,
        });
        const model = runtimeModel(options.settings);
        options.assessments.setProviderSession({
          assessmentId,
          sessionKey,
          provider: "livekit",
          providerSessionId: session.roomName,
          supportId: session.supportId,
          providerModel: model.model,
          providerVoice: model.voice,
          frameworkVersion: INTERVIEW_FRAMEWORK_VERSION,
          startedAt: Date.now(),
        });
        const nextResumeToken = options.tokens.resume(assessmentId);
        options.assessments.setResumeCredential(assessmentId, options.tokens.hash(nextResumeToken), Date.now() + 24 * 60 * 60_000);
        try {
          options.funnel.track({ sessionId: assessmentId, locale, name: "assessment_started", assessmentId, createdAt: Date.now() });
        } catch { /* telemetry cannot invalidate a created voice session */ }
        json(response, 200, {
          provider: "livekit",
          assessmentId,
          roomUrl: session.roomUrl,
          token: session.token,
          roomName: session.roomName,
          supportId: session.supportId,
          progressToken,
          resumeToken: nextResumeToken,
          sessionKey,
        });
      } catch (error) {
        if (error instanceof AssessmentVoiceError) {
          json(response, 503, { error: "The LiveKit agent was unavailable.", code: error.code });
        } else {
          const message = error instanceof Error ? error.message : "";
          json(response, message.startsWith("INVALID:") || message === "INVALID_JSON" || message === "BODY_TOO_LARGE" ? 400 : 503, {
            error: message.startsWith("INVALID:") ? "Invalid assessment request" : "The assessment could not be started.",
          });
        }
      }
      return true;
    }

    if (url.pathname === "/api/assessment/progress" && request.method === "POST") {
      try {
        const body = await readJson(request, 128_000);
        const assessmentId = requiredUuid(body.assessmentId, "assessmentId");
        const authority = progressAuthority(request, options, assessmentId);
        if (!authority) {
          json(response, 401, { error: "Invalid or expired assessment token" });
          return true;
        }
        if (!authority.worker && authority.matches === false) {
          json(response, 400, { error: "Assessment mismatch" });
          return true;
        }
        const eventId = requiredUuid(body.eventId, "eventId");
        const sessionKey = body.sessionKey === undefined ? undefined : requiredUuid(body.sessionKey, "sessionKey");
        if (typeof body.reason !== "string" || !REASONS.has(body.reason as ProgressReason)) throw new Error("INVALID:reason");
        if (!Number.isInteger(body.elapsedSeconds) || Number(body.elapsedSeconds) < 0 || Number(body.elapsedSeconds) > 900) throw new Error("INVALID:elapsedSeconds");
        const updates = parseUpdates(body.updates);
        const policy = enforceAssessmentDataPolicy(updates || []);
        const input: ProgressInput = {
          assessmentId,
          eventId,
          reason: body.reason as ProgressReason,
          elapsedSeconds: Number(body.elapsedSeconds),
          updates: policy.updates.length ? policy.updates : undefined,
        };
        json(response, 200, options.assessments.advance(assessmentId, input, policy.alerts, Date.now(), sessionKey));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("INVALID:")) json(response, 400, { error: "Invalid assessment progress" });
        else if (message === "Assessment not found" || message === "Lead not found") json(response, 404, { error: "Assessment not found" });
        else json(response, 503, { error: "Assessment progress could not be saved" });
      }
      return true;
    }

    if (url.pathname === "/api/assessment/session-status" && request.method === "GET") {
      const assessmentId = url.searchParams.get("assessmentId") || "";
      const sessionKey = url.searchParams.get("sessionKey") || "";
      const verified = options.tokens.verify(bearer(request), "progress");
      if (!verified) {
        json(response, 401, { error: "Invalid or expired assessment token" });
        return true;
      }
      if (verified.assessmentId !== assessmentId || !UUID.test(sessionKey)) {
        json(response, 403, { error: "Assessment mismatch" });
        return true;
      }
      const state = options.assessments.getFinalizationState(assessmentId, sessionKey);
      if (!state) json(response, 404, { error: "Session not found" });
      else json(response, 200, publicFinalizationState(state));
      return true;
    }

    if (url.pathname === "/api/assessment/client-diagnostic" && request.method === "POST") {
      const verified = options.tokens.verify(bearer(request), "progress");
      if (!verified) {
        json(response, 401, { error: "Invalid or expired assessment token" });
        return true;
      }
      try {
        const payload = parseClientDiagnostic(await readJson(request, 32_000));
        if (!payload.roomName.startsWith(`assessment-${verified.assessmentId}-`)) {
          json(response, 403, { error: "Assessment room mismatch" });
          return true;
        }
        const rate = options.security.checkSecurityRateLimit(`assessment-diagnostic:${verified.assessmentId}`, 120, 60 * 60_000);
        if (!rate.allowed) {
          response.setHeader("Retry-After", String(rate.retryAfter));
          json(response, 429, { error: "Diagnostic rate limit exceeded" });
          return true;
        }
        const now = Date.now();
        options.assessments.recordTelemetry({
          eventId: randomUUID(),
          assessmentId: verified.assessmentId,
          supportId: payload.supportId,
          sessionKey: payload.sessionKey,
          source: "client",
          event: payload.event,
          turnId: payload.turnId,
          state: payload.state || payload.playbackState,
          code: payload.code,
          durationMs: payload.durationMs,
          createdAt: now,
          expiresAt: now + TELEMETRY_RETENTION_MS,
        });
        response.statusCode = 204;
        response.end();
      } catch {
        json(response, 400, { error: "Invalid diagnostic event" });
      }
      return true;
    }

    if (url.pathname === "/api/assessment/complete" && request.method === "POST") {
      const verified = options.tokens.verify(bearer(request), "progress");
      if (!verified) {
        json(response, 401, { error: "Invalid or expired assessment token" });
        return true;
      }
      let assessmentId: string | undefined;
      try {
        const body = await readJson(request, 128_000);
        assessmentId = requiredUuid(body.assessmentId, "assessmentId");
        const sessionKey = requiredUuid(body.sessionKey, "sessionKey");
        if (verified.assessmentId !== assessmentId) {
          json(response, 403, { error: "Assessment mismatch" });
          return true;
        }
        if (body.locale !== "es" && body.locale !== "en") throw new Error("INVALID:locale");
        if (typeof body.transcript !== "string" || body.transcript.length > 50_000) throw new Error("INVALID:transcript");
        if (!["ultravox", "livekit", "gemini-live", "demo"].includes(String(body.provider))) throw new Error("INVALID:provider");
        if (!Number.isInteger(body.durationSeconds) || Number(body.durationSeconds) < 0 || Number(body.durationSeconds) > 1_200) throw new Error("INVALID:durationSeconds");
        const stored = options.assessments.getState(assessmentId);
        if (!stored) {
          json(response, 404, { error: "Assessment not found" });
          return true;
        }
        if (!options.assessments.claimFinalization(assessmentId, Date.now())) {
          json(response, 202, { ok: true, reviewPending: true, duplicate: true });
          return true;
        }
        const transcript = redactSensitiveText(body.transcript).text;
        const locale: AssessmentLocale = stored.lead?.locale === "en" ? "en" : body.locale;
        const result = await buildAssessmentReport(options.settings, stored.snapshot ?? undefined, locale);
        options.assessments.complete({
          assessmentId,
          sessionKey,
          transcript,
          provider: String(body.provider),
          durationSeconds: Number(body.durationSeconds),
          result,
          completionReason: "client-ended",
          completedAt: Date.now(),
        });
        try {
          options.funnel.track({ sessionId: assessmentId, locale, name: "assessment_completed", assessmentId, createdAt: Date.now() });
        } catch { /* finalization is authoritative; funnel is best effort */ }
        json(response, 200, { ok: true, reviewPending: true });
      } catch (error) {
        if (assessmentId) {
          try { options.assessments.failFinalization(assessmentId, error instanceof Error ? error.message : "client finalization failed"); } catch { /* best effort */ }
        }
        const message = error instanceof Error ? error.message : "";
        json(response, message.startsWith("INVALID:") || message === "INVALID_JSON" || message === "BODY_TOO_LARGE" ? 400 : 500, {
          error: message.startsWith("INVALID:") ? "Invalid assessment result" : "The assessment could not be completed.",
        });
      }
      return true;
    }

    if (url.pathname === "/api/assessment/recover" && request.method === "POST") {
      const verified = options.tokens.verify(bearer(request), "progress");
      if (!verified) {
        json(response, 401, { error: "Invalid or expired assessment token" });
        return true;
      }
      let nextSessionKey = "";
      let supportId = "";
      try {
        const body = await readJson(request, 32_000);
        const roomName = typeof body.roomName === "string" ? body.roomName : "";
        const sessionKey = requiredUuid(body.sessionKey, "sessionKey");
        const idempotencyKey = requiredUuid(body.idempotencyKey, "idempotencyKey");
        if (roomName.length < 20 || roomName.length > 180) throw new Error("INVALID:roomName");
        if (roomName !== `assessment-${verified.assessmentId}-${sessionKey}`) {
          json(response, 403, { error: "Assessment room mismatch" });
          return true;
        }
        const rate = options.security.checkSecurityRateLimit(`assessment-recovery:${verified.assessmentId}`, 2, 60 * 60_000);
        if (!rate.allowed) {
          response.setHeader("Retry-After", String(rate.retryAfter));
          json(response, 429, { error: "Recovery limit exceeded", code: "recovery_failed" });
          return true;
        }
        const oldSession = options.assessments.getSession(verified.assessmentId, sessionKey);
        if (!oldSession) {
          json(response, 404, { error: "Session cannot be recovered", code: "recovery_failed" });
          return true;
        }
        const replacement = randomUUID();
        let claim: { claimed: boolean; replacementSessionKey: string | null };
        try {
          claim = options.assessments.beginSessionRecovery(verified.assessmentId, sessionKey, idempotencyKey, replacement);
        } catch {
          json(response, 409, { error: "Session cannot be recovered", code: "recovery_failed" });
          return true;
        }
        nextSessionKey = claim.replacementSessionKey || replacement;
        const stored = options.assessments.getState(verified.assessmentId);
        const locale: AssessmentLocale = stored?.lead?.locale === "en" ? "en" : "es";
        const name = stored?.lead?.firstName || (locale === "es" ? "Visitante" : "Guest");
        const existing = options.assessments.getSession(verified.assessmentId, nextSessionKey);
        if (existing?.providerSessionId) {
          const credentials = await options.voice.issueParticipantToken({
            assessmentId: verified.assessmentId,
            sessionKey: nextSessionKey,
            locale,
            name,
            roomName: existing.providerSessionId,
          });
          json(response, 200, {
            provider: "livekit",
            assessmentId: verified.assessmentId,
            sessionKey: nextSessionKey,
            roomName: existing.providerSessionId,
            supportId: existing.supportId || idempotencyKey,
            ...credentials,
          });
          return true;
        }
        supportId = oldSession.supportId || idempotencyKey;
        recordServerRecoveryEvent(options, verified.assessmentId, supportId, sessionKey, "recovery_started");
        const ready = readiness(options.settings, options.workerSecret);
        if (!ready.ready) {
          json(response, 503, { error: "The agent could not be recovered", code: "LIVEKIT_NOT_CONFIGURED", issues: ready.missing });
          return true;
        }
        await options.voice.deleteRoom(roomName);
        const resumeSummary = stored?.snapshot ? JSON.stringify({
          fields: stored.snapshot.fields,
          essentialMissing: stored.snapshot.essentialMissing,
          coverageScore: stored.snapshot.coverageScore,
        }) : undefined;
        const session = await options.voice.createSession({
          assessmentId: verified.assessmentId,
          sessionKey: nextSessionKey,
          locale,
          name,
          resumeSummary,
        });
        const model = runtimeModel(options.settings);
        options.assessments.setProviderSession({
          assessmentId: verified.assessmentId,
          sessionKey: nextSessionKey,
          provider: "livekit",
          providerSessionId: session.roomName,
          supportId: session.supportId,
          providerModel: model.model,
          providerVoice: model.voice,
          frameworkVersion: INTERVIEW_FRAMEWORK_VERSION,
          startedAt: Date.now(),
        });
        recordServerRecoveryEvent(options, verified.assessmentId, session.supportId, nextSessionKey, "session_recovered");
        json(response, 200, {
          provider: "livekit",
          assessmentId: verified.assessmentId,
          roomUrl: session.roomUrl,
          token: session.token,
          roomName: session.roomName,
          supportId: session.supportId,
          sessionKey: nextSessionKey,
        });
      } catch (error) {
        if (nextSessionKey && supportId) {
          try { recordServerRecoveryEvent(options, verified.assessmentId, supportId, nextSessionKey, "recovery_failed", error instanceof Error ? error.name.slice(0, 80) : "unknown"); } catch { /* best effort */ }
        }
        const message = error instanceof Error ? error.message : "";
        json(response, message.startsWith("INVALID:") || message === "INVALID_JSON" ? 400 : 503, {
          error: message.startsWith("INVALID:") ? "Invalid recovery request" : "The agent could not be recovered",
          code: "recovery_failed",
        });
      }
      return true;
    }

    return false;
  };
}
