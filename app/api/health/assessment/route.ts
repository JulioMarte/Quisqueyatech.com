import { NextResponse } from "next/server";
import { providerConfigured } from "@/lib/server/voice";
import { createLiveKitClients } from "@/lib/server/livekit";
import { runtimeConfig } from "@/lib/server/runtime-config";
import { turnstileAllowedHostnames } from "@/lib/server/turnstile";

export async function GET() {
  const provider = "livekit" as const;
  const config = await runtimeConfig();
  const credentialsReady = Boolean(
    config.livekitUrl && config.livekitApiKey && config.livekitApiSecret,
  );
  let projectMatch = false;
  if (credentialsReady) {
    try {
      createLiveKitClients(config);
      projectMatch = true;
    } catch {
      projectMatch = false;
    }
  }
  const workerSecretReady = Boolean(process.env.ASSESSMENT_WORKER_SECRET);
  const turnstile = {
    siteKeyReady: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()),
    secretReady: Boolean(process.env.TURNSTILE_SECRET_KEY?.trim()),
    allowedHostnames: turnstileAllowedHostnames(),
    trustedProxyHeaders: process.env.TRUST_PROXY_HEADERS === "true",
  };
  const commonReady = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.ASSESSMENT_STORAGE_SECRET &&
    process.env.ASSESSMENT_TOKEN_SECRET &&
    turnstile.siteKeyReady &&
    turnstile.secretReady &&
    turnstile.trustedProxyHeaders,
  );
  const ready = commonReady && (await providerConfigured(provider));
  return NextResponse.json(
    {
      status: ready ? "ready" : "not-ready",
      provider,
      checks: { credentialsReady, projectMatch, workerSecretReady, turnstile },
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
