import type { RuntimeConfig } from "@/lib/server/runtime-config";
import { normalizeLiveKitUrl } from "@/lib/livekit/dispatch-core";

export const assessmentProvider = "livekit" as const;
export const assessmentWorkerConfigTimeoutMs = 8_000;
export const assessmentWorkerTelemetryTimeoutMs = 3_000;
export const assessmentMaxDurationSeconds = 900;
export const assessmentAgentStates = [
  "initializing",
  "ready",
  "configuration_error",
  "model_unavailable",
  "finalizing",
  "recovery_available",
] as const;

export const defaultLiveKitSubdomain = "live-translate-r87y5gh3";

export type AssessmentReadinessCode =
  | "READY"
  | "CONVEX_URL_MISSING"
  | "CONVEX_SITE_URL_MISSING"
  | "ASSESSMENT_TOKEN_SECRET_MISSING"
  | "ASSESSMENT_STORAGE_SECRET_MISSING"
  | "CONFIG_ENCRYPTION_KEY_MISSING"
  | "ADMIN_API_SECRET_MISSING"
  | "ASSESSMENT_WORKER_SECRET_MISSING"
  | "ASSESSMENT_APP_URL_MISSING"
  | "ASSESSMENT_APP_URL_INVALID"
  | "LIVEKIT_URL_MISSING"
  | "LIVEKIT_PROJECT_MISMATCH"
  | "LIVEKIT_API_KEY_MISSING"
  | "LIVEKIT_API_SECRET_MISSING"
  | "GEMINI_API_KEY_MISSING"
  | "GEMINI_LIVE_MODEL_MISSING"
  | "TURNSTILE_SITE_KEY_MISSING"
  | "TURNSTILE_SECRET_MISSING"
  | "TURNSTILE_HOSTNAMES_MISSING"
  | "TRUST_PROXY_HEADERS_DISABLED";

export type AssessmentReadinessIssue = {
  code: AssessmentReadinessCode;
  message: string;
  severity: "error" | "warning";
};

export function assessmentAppUrl() {
  const configured =
    process.env.ASSESSMENT_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return "";
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function expectedAssessmentLiveKitHostname() {
  const configured = process.env.LIVEKIT_PROJECT_SUBDOMAIN?.trim() || defaultLiveKitSubdomain;
  return configured.includes(".")
    ? configured.toLowerCase()
    : `${configured.toLowerCase()}.livekit.cloud`;
}

export function normalizeAssessmentLiveKitUrl(config: RuntimeConfig) {
  return normalizeLiveKitUrl(String(config.livekitUrl || ""), expectedAssessmentLiveKitHostname());
}

export function assessmentTurnstileAllowedHostnames() {
  const configured = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length) return configured;
  return process.env.NODE_ENV === "production"
    ? ["quisqueyatech.com", "www.quisqueyatech.com"]
    : ["localhost", "127.0.0.1", "quisqueyatech.com", "www.quisqueyatech.com"];
}

export function validateAssessmentReadiness(
  config: RuntimeConfig,
  options: { includeProductionOnly?: boolean; includeTurnstile?: boolean } = {},
) {
  const production = process.env.NODE_ENV === "production";
  const includeProductionOnly = options.includeProductionOnly ?? production;
  const includeTurnstile = options.includeTurnstile ?? true;
  const issues: AssessmentReadinessIssue[] = [];
  const add = (code: AssessmentReadinessCode, message: string) =>
    issues.push({ code, message, severity: "error" });

  if (!(process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim()))
    add("CONVEX_URL_MISSING", "CONVEX_URL or NEXT_PUBLIC_CONVEX_URL is required.");
  if (!(process.env.CONVEX_SITE_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim()))
    add("CONVEX_SITE_URL_MISSING", "CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_SITE_URL is required.");
  if (!(config.assessmentTokenSecret || process.env.ASSESSMENT_TOKEN_SECRET?.trim()))
    add("ASSESSMENT_TOKEN_SECRET_MISSING", "ASSESSMENT_TOKEN_SECRET is required.");
  if (!(config.assessmentStorageSecret || process.env.ASSESSMENT_STORAGE_SECRET?.trim()))
    add("ASSESSMENT_STORAGE_SECRET_MISSING", "ASSESSMENT_STORAGE_SECRET is required.");
  if (!process.env.ADMIN_API_SECRET?.trim())
    add("ADMIN_API_SECRET_MISSING", "ADMIN_API_SECRET is required for the Convex gateway.");
  if (!(config.assessmentWorkerSecret || process.env.ASSESSMENT_WORKER_SECRET?.trim()))
    add("ASSESSMENT_WORKER_SECRET_MISSING", "ASSESSMENT_WORKER_SECRET is required.");

  const appUrl = assessmentAppUrl();
  if (includeProductionOnly && !appUrl)
    add("ASSESSMENT_APP_URL_MISSING", "ASSESSMENT_APP_URL or NEXT_PUBLIC_SITE_URL is required.");
  if (
    (process.env.ASSESSMENT_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()) &&
    !appUrl
  )
    add("ASSESSMENT_APP_URL_INVALID", "ASSESSMENT_APP_URL must be an HTTP(S) URL.");

  if (!config.livekitUrl) add("LIVEKIT_URL_MISSING", "LIVEKIT_URL is required.");
  else {
    try {
      normalizeAssessmentLiveKitUrl(config);
    } catch (error) {
      add(
        "LIVEKIT_PROJECT_MISMATCH",
        error instanceof Error
          ? error.message
          : `LIVEKIT_URL must match ${expectedAssessmentLiveKitHostname()}.`,
      );
    }
  }
  if (!config.livekitApiKey) add("LIVEKIT_API_KEY_MISSING", "LIVEKIT_API_KEY is required.");
  if (!config.livekitApiSecret)
    add("LIVEKIT_API_SECRET_MISSING", "LIVEKIT_API_SECRET is required.");
  if (!config.geminiApiKey) add("GEMINI_API_KEY_MISSING", "GEMINI_API_KEY is required.");
  if (includeProductionOnly && !config.geminiLiveModel)
    add("GEMINI_LIVE_MODEL_MISSING", "GEMINI_LIVE_MODEL must be explicit in production.");

  if (includeTurnstile) {
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim())
      add("TURNSTILE_SITE_KEY_MISSING", "NEXT_PUBLIC_TURNSTILE_SITE_KEY is required.");
    if (!(config.turnstileSecretKey || process.env.TURNSTILE_SECRET_KEY?.trim()))
      add("TURNSTILE_SECRET_MISSING", "TURNSTILE_SECRET_KEY is required.");
    if (!assessmentTurnstileAllowedHostnames().length)
      add("TURNSTILE_HOSTNAMES_MISSING", "TURNSTILE_ALLOWED_HOSTNAMES must list public hosts.");
    if (includeProductionOnly && process.env.TRUST_PROXY_HEADERS !== "true")
      add("TRUST_PROXY_HEADERS_DISABLED", "TRUST_PROXY_HEADERS=true is required behind Coolify.");
  }

  return {
    ready: issues.length === 0,
    code: issues[0]?.code || "READY",
    issues,
    checks: {
      appUrlReady: Boolean(appUrl),
      expectedLiveKitHostname: expectedAssessmentLiveKitHostname(),
      workerSecretReady: Boolean(
        config.assessmentWorkerSecret || process.env.ASSESSMENT_WORKER_SECRET?.trim(),
      ),
      turnstileAllowedHostnames: assessmentTurnstileAllowedHostnames(),
      trustedProxyHeaders: process.env.TRUST_PROXY_HEADERS === "true",
    },
  };
}
