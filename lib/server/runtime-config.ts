import "server-only";
import { convexMachineFetch } from "@/lib/server/convex";
import { diagnosticLog, errorSummary } from "@/lib/server/diagnostic-log";
import { decryptSetting } from "@/lib/server/secure-config";

export type RuntimeConfig = Record<string, string | boolean | number | undefined>;

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
  const siteUrl =
    process.env.CONVEX_SITE_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (!process.env.ADMIN_API_SECRET || !siteUrl) {
    logRuntimeConfig("env-fallback", fallback, {
      reason: !process.env.ADMIN_API_SECRET ? "missing_admin_secret" : "missing_convex_site_url",
    });
    return fallback;
  }
  try {
    // Ciphertexts travel only over the machine HTTP gateway (Bearer secret),
    // not a public Convex query with secret-in-args.
    const stored = await convexMachineFetch<{
      config: RuntimeConfig;
      secrets: Record<string, string>;
    }>("/machine/runtime");
    const decoded = Object.fromEntries(
      Object.entries(stored.secrets).map(([name, value]) => [name, decryptSetting(value)]),
    );
    const config = { ...fallback, ...stored.config, ...decoded };
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
    // Environment variables remain the transition fallback until every
    // deployment has the encrypted settings and machine gateway configured.
    return fallback;
  }
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
