import "server-only";
import { diagnosticLog, errorSummary } from "@/lib/server/diagnostic-log";
import { resolveConvexSiteUrl } from "@/lib/server/convex-url";
import { fetchMachineRuntime } from "@/lib/server/machine-runtime-core";
import { rememberRuntimeSecrets } from "@/lib/server/runtime-secret-cache";

export type RuntimeConfig = Record<string, string | boolean | number | undefined>;

const CACHE_MS = 30_000;
let cached: { expiresAt: number; config: RuntimeConfig } | undefined;
let pending: Promise<RuntimeConfig> | undefined;

function optionalNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function runtimeConfig(): Promise<RuntimeConfig> {
  const fallback: RuntimeConfig = {
    defaultProvider: process.env.VOICE_PROVIDER,
    ultravoxApiUrl: process.env.ULTRAVOX_API_URL,
    ultravoxModel: process.env.ULTRAVOX_MODEL,
    ultravoxVoice: process.env.ULTRAVOX_VOICE,
    livekitUrl: process.env.LIVEKIT_URL,
    geminiLiveModel: process.env.GEMINI_LIVE_MODEL,
    geminiLiveVoice: process.env.GEMINI_LIVE_VOICE,
    geminiLiveTemperature: optionalNumber(process.env.GEMINI_LIVE_TEMPERATURE),
    assessmentReportModel: process.env.ASSESSMENT_REPORT_MODEL,
    ultravoxApiKey: process.env.ULTRAVOX_API_KEY,
    ultravoxWebhookSecret: process.env.ULTRAVOX_WEBHOOK_SECRET,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
    geminiApiKey: process.env.GEMINI_API_KEY,
  };
  const siteUrl = resolveConvexSiteUrl();
  if (!process.env.ADMIN_API_SECRET || !siteUrl) {
    rememberRuntimeSecrets(fallback);
    logRuntimeConfig("env-fallback", fallback, {
      reason: !process.env.ADMIN_API_SECRET ? "missing_admin_secret" : "missing_convex_site_url",
    });
    return fallback;
  }
  if (cached && cached.expiresAt > Date.now()) return cached.config;
  if (pending) return pending;
  pending = loadConvexRuntime(siteUrl, process.env.ADMIN_API_SECRET, fallback);
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}

async function loadConvexRuntime(
  siteUrl: string,
  secret: string,
  fallback: RuntimeConfig,
): Promise<RuntimeConfig> {
  try {
    const stored = await fetchMachineRuntime<RuntimeConfig>(
      `${siteUrl}/machine/runtime`,
      secret,
    );
    const config = compactMerge(fallback, stored.config);
    rememberRuntimeSecrets(config);
    cached = { config, expiresAt: Date.now() + CACHE_MS };
    logRuntimeConfig("convex-runtime", config);
    return config;
  } catch (error) {
    diagnosticLog(
      "runtime-config",
      "convex_runtime_failed",
      { source: "convex-runtime", error: errorSummary(error) },
      "error",
    );
    logRuntimeConfig("env-fallback", fallback, { reason: "convex_runtime_failed" });
    rememberRuntimeSecrets(fallback);
    // Environment variables remain the transition fallback until every
    // deployment has the encrypted settings and machine gateway configured.
    return fallback;
  }
}

function compactMerge(fallback: RuntimeConfig, primary: RuntimeConfig) {
  return Object.fromEntries(
    Object.entries({ ...fallback, ...primary }).filter(([, value]) => value !== undefined),
  ) as RuntimeConfig;
}

export function clearRuntimeConfigCache() {
  cached = undefined;
  pending = undefined;
}

function logRuntimeConfig(
  source: "convex-runtime" | "env-fallback",
  config: RuntimeConfig,
  details: Record<string, unknown> = {},
) {
  diagnosticLog("runtime-config", "loaded", {
    source,
    fields: {
      livekitUrl: Boolean(config.livekitUrl),
      livekitApiKey: Boolean(config.livekitApiKey),
      livekitApiSecret: Boolean(config.livekitApiSecret),
      geminiApiKey: Boolean(config.geminiApiKey),
      assessmentWorkerSecret: Boolean(process.env.ASSESSMENT_WORKER_SECRET?.trim()),
    },
    ...details,
  });
}
