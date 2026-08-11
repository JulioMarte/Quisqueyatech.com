type Bootstrap = {
  config?: { livekitUrl?: string; livekitApiKey?: string; livekitApiSecret?: string };
};

async function bootstrap() {
  const siteUrl = (
    process.env.ASSESSMENT_CONVEX_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? process.env.CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_SITE_URL
      : process.env.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.CONVEX_SITE_URL) ||
    ""
  ).replace(/\/$/, "");
  const secret = process.env.ASSESSMENT_WORKER_SECRET || "";
  if (!siteUrl || !secret) {
    throw new Error(
      "CONVEX_SITE_URL and ASSESSMENT_WORKER_SECRET are required to bootstrap the worker",
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${siteUrl}/machine/worker-bootstrap`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Convex worker bootstrap failed (${response.status})`);
    const body = (await response.json()) as Bootstrap;
    const config = body.config;
    if (!config?.livekitUrl || !config.livekitApiKey || !config.livekitApiSecret) {
      throw new Error("Convex worker bootstrap is incomplete");
    }
    process.env.LIVEKIT_URL = config.livekitUrl;
    process.env.LIVEKIT_API_KEY = config.livekitApiKey;
    process.env.LIVEKIT_API_SECRET = config.livekitApiSecret;
    console.log(
      JSON.stringify({
        service: "quisqueyatech-assessment",
        stage: "convex_bootstrap_loaded",
        source: "convex-env",
        livekitHost: new URL(config.livekitUrl).host,
      }),
    );
  } finally {
    clearTimeout(timer);
  }
}

await bootstrap();
const { startOpenTelemetry } = await import("./observability.js");
startOpenTelemetry();
const { runAssessmentAgent } = await import("./index.js");
await runAssessmentAgent();
