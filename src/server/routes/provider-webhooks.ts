import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createAssessmentSnapshot } from "../domain/assessment/engine";
import {
  buildAssessmentReport,
  redactSensitiveText,
} from "../services/assessment-runtime";
import type { AgendaService } from "../services/agenda";
import type { AssessmentService } from "../services/assessments";
import type { SettingsService } from "../services/settings";
import { decryptSetting } from "../services/webhook-http";

export interface ProviderWebhookRouteOptions {
  agenda: AgendaService;
  assessments: AssessmentService;
  settings: SettingsService;
  easyAppointmentsWebhookToken?: string;
  twilioAuthToken?: string;
  webhookPublicBaseURL?: string;
  ultravoxTranscriptFetcher?: (callId: string) => Promise<string>;
}

type UltravoxPayload = {
  event: string;
  call: {
    callId: string;
    created?: string;
    ended?: string;
    endReason?: string;
    metadata?: { assessmentId?: string; locale?: "es" | "en" };
  };
};

function json(response: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(payload));
  response.setHeader("Cache-Control", "no-store");
  response.end(payload);
}

function noContent(response: ServerResponse) {
  response.statusCode = 204;
  response.setHeader("Cache-Control", "no-store");
  response.end();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

async function readBuffer(request: IncomingMessage, limit: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > limit) throw new Error("BODY_TOO_LARGE");
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function parseJsonBuffer(buffer: Buffer) {
  if (!buffer.length) throw new Error("INVALID_JSON");
  try {
    const value = JSON.parse(buffer.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_JSON");
    return value as Record<string, unknown>;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function requestHeader(request: IncomingMessage, name: string) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizedPublicBaseURL(value: string | undefined) {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (url.username || url.password) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function signedRequestURL(request: IncomingMessage, url: URL, publicBaseURL: string) {
  if (publicBaseURL) return `${publicBaseURL}${url.pathname}${url.search}`;
  return url.toString();
}

function parseForm(buffer: Buffer) {
  if (buffer.length > 64_000) throw new Error("BODY_TOO_LARGE");
  const params = new URLSearchParams(buffer.toString("utf8"));
  const result: Record<string, string> = {};
  for (const [key, value] of params) result[key] = value;
  return result;
}

function twilioSignature(authToken: string, signedUrl: string, form: Record<string, string>) {
  const signedPayload = signedUrl + Object.keys(form)
    .sort()
    .map((key) => `${key}${form[key]}`)
    .join("");
  return createHmac("sha1", authToken).update(signedPayload).digest("base64");
}

function ultravoxWebhookSecret(settings: SettingsService) {
  const encrypted = settings.internalRuntime().secrets.ultravoxWebhookSecret;
  if (!encrypted) return "";
  try { return decryptSetting(encrypted); } catch { return ""; }
}

function verifyUltravoxSignature(request: IncomingMessage, raw: string, secret: string, now = Date.now()) {
  if (!secret) return false;
  const timestamp = requestHeader(request, "x-ultravox-webhook-timestamp");
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time) || Math.abs(now - time) > 60_000) return false;
  const expected = createHmac("sha256", secret).update(raw + timestamp).digest("hex");
  const signatures = requestHeader(request, "x-ultravox-webhook-signature")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return signatures.some((signature) => safeEqual(expected, signature));
}

function parseUltravoxPayload(raw: string): UltravoxPayload {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("INVALID_JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_JSON");
  const payload = value as Partial<UltravoxPayload>;
  if (
    typeof payload.event !== "string" || !payload.event || payload.event.length > 120 ||
    !payload.call || typeof payload.call !== "object" ||
    typeof payload.call.callId !== "string" || !payload.call.callId || payload.call.callId.length > 200
  ) throw new Error("INVALID_ULTRAVOX_PAYLOAD");
  for (const item of [payload.call.created, payload.call.ended, payload.call.endReason]) {
    if (item !== undefined && (typeof item !== "string" || item.length > 300)) throw new Error("INVALID_ULTRAVOX_PAYLOAD");
  }
  return payload as UltravoxPayload;
}

function defaultUltravoxTranscriptFetcher(settings: SettingsService) {
  return async (callId: string) => {
    const runtime = settings.internalRuntime();
    const encryptedKey = runtime.secrets.ultravoxApiKey;
    if (!encryptedKey) throw new Error("ULTRAVOX_API_KEY_MISSING");
    const apiKey = decryptSetting(encryptedKey);
    const base = String(runtime.config.ultravoxApiUrl || "https://api.ultravox.ai/api/calls").replace(/\/$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(`${base}/${encodeURIComponent(callId)}/messages`, {
        headers: { "X-API-Key": apiKey },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Ultravox transcript failed (${response.status})`);
      const payload = await response.json() as
        | { results?: Array<{ role?: string; text?: string }> }
        | Array<{ role?: string; text?: string }>;
      const messages = Array.isArray(payload) ? payload : payload.results || [];
      return messages.map((item) => `${item.role || "unknown"}: ${item.text || ""}`).join("\n");
    } finally {
      clearTimeout(timer);
    }
  };
}

function durationSeconds(payload: UltravoxPayload, fallback: number) {
  const created = payload.call.created ? new Date(payload.call.created).getTime() : Number.NaN;
  const ended = payload.call.ended ? new Date(payload.call.ended).getTime() : Number.NaN;
  if (Number.isFinite(created) && Number.isFinite(ended) && ended >= created) {
    return Math.min(900, Math.round((ended - created) / 1_000));
  }
  return Math.min(900, Math.max(0, fallback));
}

export function createProviderWebhookRoutes(options: ProviderWebhookRouteOptions) {
  const publicBaseURL = normalizedPublicBaseURL(options.webhookPublicBaseURL);
  const transcriptFetcher = options.ultravoxTranscriptFetcher ?? defaultUltravoxTranscriptFetcher(options.settings);

  return async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
    if (!url.pathname.startsWith("/api/webhooks/")) return false;

    if (url.pathname === "/api/webhooks/easy-appointments" && request.method === "POST") {
      const expected = options.easyAppointmentsWebhookToken?.trim() || "";
      if (!expected) {
        json(response, 503, { error: "Webhook service is not configured" });
        return true;
      }
      if (!safeEqual(expected, requestHeader(request, "x-ea-token"))) {
        json(response, 401, { error: "Unauthorized" });
        return true;
      }
      try {
        const raw = await readBuffer(request, 256_000);
        const payload = parseJsonBuffer(raw);
        const canonicalPayload = JSON.stringify(payload);
        const requestId = requestHeader(request, "x-request-id").slice(0, 100) || crypto.randomUUID();
        const eventId = requestHeader(request, "x-ea-event-id").slice(0, 160)
          || createHash("sha256").update(canonicalPayload).digest("base64url");
        const event = requestHeader(request, "x-ea-action").slice(0, 80) || "Save";
        options.agenda.applyEasyAppointmentsWebhook({ eventId, event, payload: canonicalPayload, requestId });
        json(response, 200, { ok: true, requestId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        json(response, message === "INVALID_JSON" || message === "BODY_TOO_LARGE" || message === "INVALID_WEBHOOK" || message === "INVALID_WEBHOOK_PAYLOAD" ? 400 : 503, {
          error: message === "INVALID_JSON" ? "Invalid payload" : "Webhook processing failed",
        });
      }
      return true;
    }

    if (url.pathname === "/api/webhooks/twilio" && request.method === "POST") {
      const authToken = options.twilioAuthToken?.trim() || "";
      if (!authToken || !publicBaseURL) {
        json(response, 503, { error: "Webhook service is not configured" });
        return true;
      }
      try {
        const raw = await readBuffer(request, 64_000);
        const form = parseForm(raw);
        const expected = twilioSignature(authToken, signedRequestURL(request, url, publicBaseURL), form);
        if (!safeEqual(expected, requestHeader(request, "x-twilio-signature"))) {
          json(response, 401, { error: "Unauthorized" });
          return true;
        }
        options.agenda.recordCallWebhook({
          callSid: String(form.CallSid || ""),
          status: String(form.CallStatus || "unknown"),
          payload: JSON.stringify(form),
        });
        json(response, 200, { ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        json(response, message === "BODY_TOO_LARGE" || message === "INVALID_CALL_WEBHOOK" ? 400 : 503, {
          error: "Webhook processing failed",
        });
      }
      return true;
    }

    if (url.pathname === "/api/webhooks/ultravox" && request.method === "POST") {
      let eventId = "";
      try {
        const rawBuffer = await readBuffer(request, 128_000);
        const raw = rawBuffer.toString("utf8");
        const secret = ultravoxWebhookSecret(options.settings);
        if (!secret) {
          json(response, 503, { error: "Webhook service is not configured" });
          return true;
        }
        if (!verifyUltravoxSignature(request, raw, secret)) {
          json(response, 401, { error: "Invalid signature" });
          return true;
        }
        const payload = parseUltravoxPayload(raw);
        eventId = `${payload.event}:${payload.call.callId}:${payload.call.ended || payload.call.created || "unknown"}`;
        if (eventId.length > 300) eventId = createHash("sha256").update(eventId).digest("base64url");
        const receivedAt = Date.now();
        const fresh = options.assessments.recordWebhook({
          eventId,
          provider: "ultravox",
          event: payload.event,
          payload: redactSensitiveText(raw.slice(0, 100_000)).text,
          receivedAt,
        });
        if (!fresh) {
          noContent(response);
          return true;
        }
        if (payload.event !== "call.ended") {
          options.assessments.finishWebhook(eventId, true, undefined, Date.now());
          noContent(response);
          return true;
        }

        const stored = options.assessments.getByProviderSession(payload.call.callId);
        if (!stored) throw new Error("Assessment session not found");
        const transcript = redactSensitiveText(await transcriptFetcher(payload.call.callId)).text;
        const locale: "es" | "en" = stored.lead?.locale === "en" || payload.call.metadata?.locale === "en" ? "en" : "es";
        const snapshot = stored.snapshot || createAssessmentSnapshot(locale, stored.createdAt);
        const elapsed = durationSeconds(payload, snapshot.elapsedSeconds);
        const progress = options.assessments.advance(
          stored.assessmentId,
          {
            assessmentId: stored.assessmentId,
            eventId: crypto.randomUUID(),
            reason: snapshot.complete ? "close" : "interruption",
            elapsedSeconds: elapsed,
          },
          [],
          Date.now(),
          stored.session.sessionKey,
        );
        options.assessments.storeSessionReport({
          sessionKey: stored.session.sessionKey,
          transcript,
          report: { providerEvent: payload.event },
          endedAt: Date.now(),
          durationSeconds: elapsed,
          completionReason: payload.call.endReason || "ultravox-call-ended",
        });
        if (options.assessments.claimFinalization(stored.assessmentId, Date.now())) {
          const report = await buildAssessmentReport(options.settings, progress.snapshot, locale);
          options.assessments.complete({
            assessmentId: stored.assessmentId,
            sessionKey: stored.session.sessionKey,
            transcript,
            provider: "ultravox",
            durationSeconds: elapsed,
            result: report,
            completionReason: payload.call.endReason || "ultravox-call-ended",
            completedAt: Date.now(),
          });
        }
        options.assessments.finishWebhook(eventId, true, undefined, Date.now());
        noContent(response);
      } catch (error) {
        if (eventId) {
          try { options.assessments.finishWebhook(eventId, false, error instanceof Error ? error.message : "unknown", Date.now()); } catch { /* best effort */ }
        }
        const message = error instanceof Error ? error.message : "";
        if (message === "BODY_TOO_LARGE" || message === "INVALID_JSON" || message === "INVALID_ULTRAVOX_PAYLOAD") {
          json(response, 400, { error: "Invalid payload" });
        } else {
          json(response, 503, { error: "Webhook processing failed" });
        }
      }
      return true;
    }

    if (["/api/webhooks/easy-appointments", "/api/webhooks/twilio", "/api/webhooks/ultravox"].includes(url.pathname)) {
      response.setHeader("Allow", "POST");
      json(response, 405, { error: "Method not allowed" });
      return true;
    }

    return false;
  };
}
