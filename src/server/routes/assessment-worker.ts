import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AssessmentEvidence, AssessmentFieldKey, ProgressInput, ProgressReason } from "../domain/assessment/types";
import type { AssessmentService } from "../services/assessments";
import {
  TELEMETRY_RETENTION_MS,
  assessmentPrompt,
  buildAssessmentReport,
  enforceAssessmentDataPolicy,
  redactSensitiveText,
  workerRuntimeConfig,
} from "../services/assessment-runtime";
import type { SettingsService } from "../services/settings";

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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AssessmentWorkerRouteOptions {
  workerSecret: string;
  assessments: AssessmentService;
  settings: SettingsService;
}

function json(response: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(payload));
  response.setHeader("Cache-Control", "no-store");
  response.end(payload);
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function bearer(request: IncomingMessage) {
  const authorization = request.headers.authorization ?? "";
  return authorization.replace(/^Bearer\s+/i, "").trim();
}

function authorized(request: IncomingMessage, secret: string) {
  return safeEqual(secret, bearer(request));
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
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
  return parsed as Record<string, unknown>;
}

function requiredUuid(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string" || !UUID.test(value)) throw new Error(`INVALID:${key}`);
  return value;
}

function optionalString(body: Record<string, unknown>, key: string, max: number) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > max) throw new Error(`INVALID:${key}`);
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
    if (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 1) throw new Error("INVALID:confidence");
    return {
      field: input.field as AssessmentFieldKey,
      value: input.value.trim(),
      evidence: input.evidence.trim(),
      status: input.status as AssessmentEvidence["status"],
      confidence: input.confidence,
    };
  });
}

function publicFinalizationState(state: { assessmentStatus: string; completionReason?: string | null; sessionStatus: string }) {
  const publicStatuses = new Set(["in_progress", "finalizing", "completed", "interrupted", "finalization_failed"]);
  const raw = state.assessmentStatus;
  const status = raw === "completed" || raw === "finalizing" || raw === "finalization_failed"
    ? raw
    : state.sessionStatus === "interrupted" || state.sessionStatus === "recovering"
      ? "interrupted"
      : publicStatuses.has(raw) ? raw : "in_progress";
  const publicReasons = new Set(["assessment-completed", "user-requested-end", "hard-time-limit", "client-ended", "close"]);
  return {
    status,
    reason: status === "finalization_failed"
      ? "FINALIZATION_FAILED"
      : state.completionReason && publicReasons.has(state.completionReason) ? state.completionReason : null,
    resultAvailable: status === "completed",
  };
}

export function createAssessmentWorkerRoutes(options: AssessmentWorkerRouteOptions) {
  return async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
    if (!url.pathname.startsWith("/api/assessment/")) return false;

    const workerOnly = new Set([
      "/api/assessment/worker-config",
      "/api/assessment/prompt",
      "/api/assessment/progress",
      "/api/assessment/session-status",
      "/api/assessment/worker-diagnostic",
      "/api/assessment/provider-finalize",
    ]);
    if (!workerOnly.has(url.pathname)) return false;
    if (!authorized(request, options.workerSecret)) {
      json(response, 401, { error: "Unauthorized" });
      return true;
    }

    if (url.pathname === "/api/assessment/worker-config" && request.method === "GET") {
      try {
        json(response, 200, workerRuntimeConfig(options.settings));
      } catch (error) {
        const code = error instanceof Error ? error.message : "CONFIGURATION_ERROR";
        json(response, 503, { error: "Assessment worker configuration is incomplete", code });
      }
      return true;
    }

    if (url.pathname === "/api/assessment/prompt" && request.method === "GET") {
      const assessmentId = url.searchParams.get("assessmentId") || "";
      if (!UUID.test(assessmentId)) {
        json(response, 400, { error: "Invalid assessment" });
        return true;
      }
      const stored = options.assessments.getState(assessmentId);
      if (!stored) {
        json(response, 404, { error: "Assessment not found" });
        return true;
      }
      const locale = stored.lead?.locale === "en" ? "en" : "es";
      json(response, 200, {
        prompt: assessmentPrompt(locale, stored.lead?.firstName || (locale === "es" ? "visitante" : "guest"), stored.snapshot ? JSON.stringify(stored.snapshot) : undefined),
      });
      return true;
    }

    if (url.pathname === "/api/assessment/progress" && request.method === "POST") {
      try {
        const body = await readJson(request, 128_000);
        const assessmentId = requiredUuid(body, "assessmentId");
        const eventId = requiredUuid(body, "eventId");
        const sessionKey = body.sessionKey === undefined ? undefined : requiredUuid(body, "sessionKey");
        const reason = body.reason;
        if (typeof reason !== "string" || !REASONS.has(reason as ProgressReason)) throw new Error("INVALID:reason");
        const elapsedSeconds = body.elapsedSeconds;
        if (!Number.isInteger(elapsedSeconds) || Number(elapsedSeconds) < 0 || Number(elapsedSeconds) > 900) throw new Error("INVALID:elapsedSeconds");
        const updates = parseUpdates(body.updates);
        const policy = enforceAssessmentDataPolicy(updates || []);
        const input: ProgressInput = {
          assessmentId,
          eventId,
          reason: reason as ProgressReason,
          elapsedSeconds: Number(elapsedSeconds),
          updates: policy.updates.length ? policy.updates : undefined,
        };
        const output = options.assessments.advance(assessmentId, input, policy.alerts, Date.now(), sessionKey);
        json(response, 200, output);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("INVALID:")) json(response, 400, { error: "Invalid assessment progress" });
        else if (message === "Assessment not found" || message === "Lead not found") json(response, 404, { error: "Assessment not found" });
        else json(response, 503, { error: "Assessment progress could not be saved" });
      }
      return true;
    }

    if (url.pathname === "/api/assessment/session-status" && request.method === "POST") {
      try {
        const body = await readJson(request, 32_000);
        const assessmentId = requiredUuid(body, "assessmentId");
        const sessionKey = requiredUuid(body, "sessionKey");
        const completionReason = optionalString(body, "completionReason", 80);
        if (!completionReason) throw new Error("INVALID:completionReason");
        const result = options.assessments.markSessionFinalizing(assessmentId, sessionKey, completionReason, Date.now());
        json(response, 200, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("INVALID:")) json(response, 400, { error: "Invalid finalization state" });
        else if (message === "Assessment not found" || message === "Session not found") json(response, 404, { error: "Session not found" });
        else json(response, 503, { error: "Finalization state could not be saved" });
      }
      return true;
    }

    if (url.pathname === "/api/assessment/worker-diagnostic" && request.method === "POST") {
      try {
        const body = await readJson(request, 32_000);
        const eventId = requiredUuid(body, "eventId");
        const assessmentId = requiredUuid(body, "assessmentId");
        const supportId = requiredUuid(body, "supportId");
        const sessionKey = requiredUuid(body, "sessionKey");
        if (typeof body.event !== "string" || !TELEMETRY_EVENTS.has(body.event)) throw new Error("INVALID:event");
        const turnId = optionalString(body, "turnId", 80);
        const state = optionalString(body, "state", 80);
        const code = optionalString(body, "code", 80);
        const durationMs = body.durationMs;
        if (durationMs !== undefined && (!Number.isInteger(durationMs) || Number(durationMs) < 0 || Number(durationMs) > 1_000_000)) throw new Error("INVALID:durationMs");
        if (body.recoverable !== undefined && typeof body.recoverable !== "boolean") throw new Error("INVALID:recoverable");
        const now = Date.now();
        options.assessments.recordTelemetry({
          eventId,
          assessmentId,
          supportId,
          sessionKey,
          source: "worker",
          event: body.event,
          turnId,
          state,
          code,
          durationMs: durationMs === undefined ? undefined : Number(durationMs),
          recoverable: body.recoverable as boolean | undefined,
          createdAt: now,
          expiresAt: now + TELEMETRY_RETENTION_MS,
        });
        response.statusCode = 204;
        response.end();
      } catch {
        json(response, 400, { error: "Invalid telemetry event" });
      }
      return true;
    }

    if (url.pathname === "/api/assessment/provider-finalize" && request.method === "POST") {
      let assessmentId: string | undefined;
      try {
        const body = await readJson(request);
        assessmentId = requiredUuid(body, "assessmentId");
        const sessionKey = requiredUuid(body, "sessionKey");
        const provider = body.provider;
        if (provider !== "livekit" && provider !== "gemini-live") throw new Error("INVALID:provider");
        if (typeof body.transcript !== "string" || body.transcript.length > 100_000) throw new Error("INVALID:transcript");
        const durationSeconds = body.durationSeconds;
        if (!Number.isInteger(durationSeconds) || Number(durationSeconds) < 0 || Number(durationSeconds) > 1_000) throw new Error("INVALID:durationSeconds");
        const completionReason = optionalString(body, "completionReason", 200);
        if (!completionReason || typeof body.finalizeAssessment !== "boolean") throw new Error("INVALID:finalization");
        const transcript = redactSensitiveText(body.transcript).text;
        const state = options.assessments.getFinalizationState(assessmentId, sessionKey);
        if (!state) {
          json(response, 404, { error: "Session not found" });
          return true;
        }
        const recovering = state.sessionStatus === "recovering";
        const shouldFinalize = !recovering && (body.finalizeAssessment || state.completionReason === "close");
        options.assessments.storeSessionReport({
          sessionKey,
          transcript,
          report: body.sessionReport ?? {},
          endedAt: Date.now(),
          durationSeconds: Number(durationSeconds),
          completionReason,
          status: shouldFinalize ? "ended" : recovering ? "recovered" : "interrupted",
        });
        if (!shouldFinalize) {
          json(response, 200, { ok: true, interrupted: true });
          return true;
        }
        const claimed = options.assessments.claimFinalization(assessmentId, Date.now());
        if (!claimed) {
          json(response, 200, { ok: true, duplicate: true });
          return true;
        }
        const stored = options.assessments.getState(assessmentId);
        const locale = stored?.lead?.locale === "en" ? "en" : "es";
        const result = await buildAssessmentReport(options.settings, stored?.snapshot ?? undefined, locale);
        options.assessments.complete({
          assessmentId,
          sessionKey,
          transcript,
          provider,
          durationSeconds: Number(durationSeconds),
          result,
          completionReason,
          completedAt: Date.now(),
        });
        json(response, 200, { ok: true });
      } catch (error) {
        if (assessmentId) {
          try { options.assessments.failFinalization(assessmentId, error instanceof Error ? error.message : "provider finalization failed"); } catch { /* best effort */ }
        }
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("INVALID:")) json(response, 400, { error: "Invalid provider finalization" });
        else json(response, 503, { error: "Finalization failed" });
      }
      return true;
    }

    response.setHeader("Allow", url.pathname === "/api/assessment/worker-config" || url.pathname === "/api/assessment/prompt" ? "GET" : "POST");
    json(response, 405, { error: "Method not allowed" });
    return true;
  };
}

export { publicFinalizationState };
