import { randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { toNodeHandler } from "better-auth/node";
import { createAuthRuntime } from "./auth";
import { SQLiteDatabase, databasePath as defaultDatabasePath } from "./db/sqlite";
import { createAssessmentPublicRoutes } from "./routes/assessment-public";
import { createAssessmentWorkerRoutes } from "./routes/assessment-worker";
import { AdminSecurityService } from "./services/admin-security";
import { AgendaService, type BookingCreateInput } from "./services/agenda";
import { AssessmentTokenService } from "./services/assessment-tokens";
import { assessmentVoiceFromSettings, type AssessmentVoiceRuntime } from "./services/assessment-voice";
import { AssessmentService } from "./services/assessments";
import { AuthRecoveryService } from "./services/auth-recovery";
import { FunnelService } from "./services/funnel";
import { SettingsService } from "./services/settings";
import { turnstileVerifierFromEnv, type TurnstileAction, type TurnstileResult } from "./services/turnstile";

const DEV_ASSESSMENT_TOKEN_SECRET = "local-development-assessment-token-secret-change-me";

export interface ApiRuntimeOptions {
  databasePath?: string;
  authSecret: string;
  authBaseURL: string;
  trustedOrigins?: string[];
  adminSetupCode?: string;
  adminApiSecret: string;
  assessmentWorkerSecret?: string;
  assessmentTokenSecret?: string;
  assessmentVoice?: AssessmentVoiceRuntime;
  clientIpHeaders?: string[];
  verifyTurnstile?: (token: string | undefined, ip: string | undefined, action: TurnstileAction) => Promise<TurnstileResult>;
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

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function bearer(request: IncomingMessage) {
  const authorization = request.headers.authorization ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function normalizedOrigin(value: string) {
  try { return new URL(value).origin; } catch { return ""; }
}

function civilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function validTimeZone(value: string) {
  if (!value || value.length > 80 || value !== value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function requestIp(request: IncomingMessage, configuredHeaders: string[]) {
  for (const configured of configuredHeaders) {
    const name = configured.trim().toLowerCase();
    if (!name) continue;
    const raw = request.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.trim()) return value.split(",")[0].trim().slice(0, 128);
  }
  return request.socket.remoteAddress?.slice(0, 128) || "ip-unavailable";
}

function applyCors(request: IncomingMessage, response: ServerResponse, trustedOrigins: string[]) {
  const origin = typeof request.headers.origin === "string" ? normalizedOrigin(request.headers.origin) : "";
  if (origin && trustedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    return origin;
  }
  return "";
}

async function readJson(request: IncomingMessage, limit = 16_384) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > limit) throw new Error("BODY_TOO_LARGE");
    chunks.push(value);
  }
  if (!chunks.length) return {} as Record<string, unknown>;
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_JSON");
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") throw error;
    throw new Error("INVALID_JSON");
  }
}

function stringField(body: Record<string, unknown>, key: string, minimum: number, maximum: number, optional = false) {
  const value = body[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== "string") throw new Error(`VALIDATION:${key}`);
  const trimmed = value.trim();
  if (trimmed.length < minimum || trimmed.length > maximum) throw new Error(`VALIDATION:${key}`);
  return trimmed;
}

function bookingInput(body: Record<string, unknown>, bookingId: string): BookingCreateInput & { turnstileToken?: string } {
  const locale = body.locale;
  const channel = body.channel;
  const processingConsent = body.processingConsent;
  const recordingConsent = body.recordingConsent;
  const email = stringField(body, "email", 3, 160)!;
  const phone = stringField(body, "phone", 8, 24)!;
  const start = stringField(body, "start", 1, 64)!;
  const timezone = stringField(body, "timezone", 1, 80)!;
  const website = body.website;

  if (locale !== "es" && locale !== "en") throw new Error("VALIDATION:locale");
  if (channel !== "web" && channel !== "phone") throw new Error("VALIDATION:channel");
  if (processingConsent !== true) throw new Error("VALIDATION:processingConsent");
  if (typeof recordingConsent !== "boolean") throw new Error("VALIDATION:recordingConsent");
  if (website !== undefined && website !== "") throw new Error("VALIDATION:website");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("VALIDATION:email");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("VALIDATION:phone");
  if (!Number.isFinite(Date.parse(start)) || new Date(Date.parse(start)).toISOString() !== start) throw new Error("VALIDATION:start");
  if (!validTimeZone(timezone)) throw new Error("VALIDATION:timezone");

  return {
    bookingId,
    firstName: stringField(body, "firstName", 2, 60)!,
    lastName: stringField(body, "lastName", 2, 80)!,
    company: stringField(body, "company", 0, 120, true),
    role: stringField(body, "role", 0, 100, true),
    country: stringField(body, "country", 2, 80)!,
    locale,
    email,
    phone,
    notes: stringField(body, "notes", 0, 1000, true),
    recordingConsent,
    start,
    timezone,
    channel,
    turnstileToken: typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
  };
}

export function createApiRuntime(options: ApiRuntimeOptions) {
  if (options.adminApiSecret.trim().length < 24) throw new Error("ADMIN_API_SECRET must be at least 24 characters");
  const path = options.databasePath ?? defaultDatabasePath();
  const database = new SQLiteDatabase({ path });
  const settings = new SettingsService(database);
  const security = new AdminSecurityService(database);
  const recovery = new AuthRecoveryService(database);
  const agenda = new AgendaService(database);
  const assessments = new AssessmentService(database);
  const funnel = new FunnelService(database);
  const verifyTurnstile = options.verifyTurnstile ?? turnstileVerifierFromEnv();
  const clientIpHeaders = options.clientIpHeaders ?? [];
  const trustedOrigins = [...new Set((options.trustedOrigins ?? []).map(normalizedOrigin).filter(Boolean))];
  const workerSecret = options.assessmentWorkerSecret?.trim() ?? "";
  const tokenSecret = options.assessmentTokenSecret?.trim() || DEV_ASSESSMENT_TOKEN_SECRET;
  const tokens = new AssessmentTokenService(tokenSecret);
  const voice = options.assessmentVoice ?? assessmentVoiceFromSettings(settings);
  const assessmentPublicRoutes = createAssessmentPublicRoutes({
    workerSecret,
    tokens,
    assessments,
    settings,
    security,
    funnel,
    voice,
    requestIp: (request) => requestIp(request, clientIpHeaders),
    verifyTurnstile,
  });
  const assessmentWorkerRoutes = createAssessmentWorkerRoutes({ workerSecret, assessments, settings });
  const authRuntime = createAuthRuntime({
    databasePath: path,
    secret: options.authSecret,
    baseURL: options.authBaseURL,
    trustedOrigins,
    setupCode: options.adminSetupCode ?? "",
  });
  const authHandler = toNodeHandler(authRuntime.auth);

  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    const host = request.headers.host ?? "127.0.0.1";
    const protocol = request.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const url = new URL(request.url ?? "/", `${protocol}://${host}`);

    if (url.pathname === "/healthz" && request.method === "GET") {
      database.prepare("SELECT 1").get();
      json(response, 200, { ok: true, database: "sqlite" });
      return;
    }

    if (url.pathname === "/admin/setup/status" && request.method === "GET") {
      json(response, 200, security.setupStatus(Date.now(), options.adminSetupCode ?? ""));
      return;
    }

    if (url.pathname === "/admin/recover" && request.method === "POST") {
      if (!safeEqual(bearer(request), options.adminApiSecret)) {
        json(response, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const body = await readJson(request);
        await recovery.recover({
          codeHash: typeof body.codeHash === "string" ? body.codeHash : "",
          newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
        });
        json(response, 200, { ok: true });
      } catch {
        json(response, 400, { error: "Invalid recovery request" });
      }
      return;
    }

    if (url.pathname === "/machine/runtime" && (request.method === "GET" || request.method === "POST")) {
      if (!safeEqual(bearer(request), options.adminApiSecret)) {
        json(response, 401, { error: "Unauthorized" });
        return;
      }
      json(response, 200, settings.internalRuntime());
      return;
    }

    if (url.pathname === "/machine/runtime") {
      response.setHeader("Allow", "GET, POST");
      json(response, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname === "/api/scheduling/availability" && request.method === "GET") {
      applyCors(request, response, trustedOrigins);
      const ip = requestIp(request, clientIpHeaders);
      const rate = security.checkSecurityRateLimit(`availability:${ip}`, 120, 60 * 60_000);
      if (!rate.allowed) {
        response.setHeader("Retry-After", String(rate.retryAfter));
        json(response, 429, { error: "Too many availability requests" });
        return;
      }
      const date = url.searchParams.get("date") ?? "";
      const timezone = url.searchParams.get("timezone") || "America/Santo_Domingo";
      const locale = url.searchParams.get("locale") || "es";
      if (!civilDate(date)) {
        json(response, 400, { error: "Invalid date" });
        return;
      }
      if (!validTimeZone(timezone)) {
        json(response, 400, { error: "Invalid timezone" });
        return;
      }
      if (locale !== "es" && locale !== "en") {
        json(response, 400, { error: "Invalid locale" });
        return;
      }
      try {
        const slots = agenda.availability({ date, timezone, locale });
        json(response, 200, { configured: true, slots }, { "Cache-Control": "private, max-age=30" });
      } catch {
        json(response, 503, { configured: false, slots: [] });
      }
      return;
    }

    if (url.pathname === "/api/scheduling/book" && request.method === "POST") {
      applyCors(request, response, trustedOrigins);
      const ip = requestIp(request, clientIpHeaders);
      const rate = security.checkSecurityRateLimit(`booking:${ip}`, 8, 60 * 60_000);
      if (!rate.allowed) {
        response.setHeader("Retry-After", String(rate.retryAfter));
        json(response, 429, { error: "Too many booking attempts" });
        return;
      }
      try {
        const body = await readJson(request);
        const requestedKey = typeof request.headers["idempotency-key"] === "string" ? request.headers["idempotency-key"].trim() : "";
        const safeKey = /^[A-Za-z0-9._:-]{1,120}$/.test(requestedKey) ? requestedKey : "";
        const attemptId = typeof body.bookingAttemptId === "string" && /^[0-9a-f-]{36}$/i.test(body.bookingAttemptId)
          ? body.bookingAttemptId
          : "";
        const bookingId = attemptId || safeKey || randomUUID();
        const parsed = bookingInput(body, bookingId);
        const human = await verifyTurnstile(parsed.turnstileToken, ip, "scheduling_book");
        if (!human.ok) {
          json(response, human.code === "TURNSTILE_UNAVAILABLE" ? 503 : 403, {
            error: "Human verification failed",
            code: human.code,
            supportId: human.supportId,
          });
          return;
        }
        const { turnstileToken: _turnstileToken, ...input } = parsed;
        void _turnstileToken;
        const result = agenda.create(input);
        try {
          funnel.track({ sessionId: bookingId, locale: input.locale, name: "assessment_booked", bookingId, createdAt: Date.now() });
        } catch {
          // Funnel telemetry must never turn a committed booking into an HTTP failure.
        }
        json(response, 200, { ok: true, bookingId, configured: true, confirmed: result.confirmed, status: result.status });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("SLOT_UNAVAILABLE")) {
          json(response, 409, { error: "That time is no longer available", code: "slot_unavailable" });
        } else if (message.startsWith("VALIDATION:") || message === "INVALID_JSON" || message === "BODY_TOO_LARGE" || message === "INVALID_BOOKING") {
          json(response, 400, {
            error: "Invalid booking",
            field: message.startsWith("VALIDATION:") ? message.slice("VALIDATION:".length) : undefined,
            code: "validation",
          });
        } else {
          json(response, 502, { error: "We could not save the appointment." });
        }
      }
      return;
    }

    if (url.pathname.startsWith("/api/assessment/")) {
      const origin = applyCors(request, response, trustedOrigins);
      if (request.method === "OPTIONS") {
        if (!origin) {
          json(response, 403, { error: "Origin not allowed" });
          return;
        }
        response.statusCode = 204;
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.end();
        return;
      }
      if (await assessmentPublicRoutes(request, response, url)) return;
      if (await assessmentWorkerRoutes(request, response, url)) return;
    }

    if (url.pathname.startsWith("/api/auth/")) {
      const origin = applyCors(request, response, trustedOrigins);
      if (origin) response.setHeader("Access-Control-Allow-Credentials", "true");
      if (request.method === "OPTIONS") {
        if (!origin) {
          json(response, 403, { error: "Origin not allowed" });
          return;
        }
        response.statusCode = 204;
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Setup-Code, X-Admin-Recovery-Hashes");
        response.end();
        return;
      }
      await authHandler(request, response);
      return;
    }

    json(response, 404, { error: "Not found" });
  };

  return {
    handler,
    database,
    auth: authRuntime.auth,
    close() {
      authRuntime.close();
      database.close();
    },
  };
}

export function apiRuntimeFromEnv() {
  const assessmentTokenSecret = process.env.ASSESSMENT_TOKEN_SECRET?.trim() ?? "";
  if (process.env.NODE_ENV === "production" && assessmentTokenSecret.length < 32) {
    throw new Error("ASSESSMENT_TOKEN_SECRET must be at least 32 characters in production");
  }
  return createApiRuntime({
    authSecret: process.env.BETTER_AUTH_SECRET?.trim() ?? "",
    authBaseURL: process.env.BETTER_AUTH_URL?.trim() || "http://127.0.0.1:8787",
    trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    adminSetupCode: process.env.ADMIN_SETUP_CODE?.trim() ?? "",
    adminApiSecret: process.env.ADMIN_API_SECRET?.trim() ?? "",
    assessmentWorkerSecret: process.env.ASSESSMENT_WORKER_SECRET?.trim() ?? "",
    assessmentTokenSecret: assessmentTokenSecret || DEV_ASSESSMENT_TOKEN_SECRET,
    clientIpHeaders: (process.env.TRUSTED_CLIENT_IP_HEADERS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  });
}
