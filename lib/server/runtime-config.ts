import "server-only";
import { convexQuery } from "@/lib/server/convex";
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
  if (!process.env.ADMIN_API_SECRET) return fallback;
  try {
    const stored = await convexQuery("settings:serviceRuntime", {
      secret: process.env.ADMIN_API_SECRET,
    }) as { config: RuntimeConfig; secrets: Record<string, string> };
    const decoded = Object.fromEntries(
      Object.entries(stored.secrets).map(([name, value]) => [name, decryptSetting(value)]),
    );
    return { ...fallback, ...stored.config, ...decoded };
  } catch {
    // Environment variables remain the transition fallback until every
    // deployment has the encrypted settings and service secret configured.
    return fallback;
  }
}
