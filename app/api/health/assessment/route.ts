import { NextResponse } from "next/server";
import { createLiveKitClients, probeLiveKitAgent } from "@/lib/server/livekit";
import { runtimeConfig } from "@/lib/server/runtime-config";
import { turnstilePublicConfig } from "@/lib/security/turnstile-config";
import { turnstileAllowedHostnames, turnstileServerConfig } from "@/lib/server/turnstile";
import {
  assessmentProvider,
  validateAssessmentReadiness,
} from "@/lib/server/assessment-livekit-config";

export async function GET(request: Request) {
  const provider = assessmentProvider;
  const config = await runtimeConfig();
  const readiness = validateAssessmentReadiness(config);
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
  const workerSecretReady = Boolean(
    config.assessmentWorkerSecret || process.env.ASSESSMENT_WORKER_SECRET,
  );
  const publicTurnstile = turnstilePublicConfig();
  const serverTurnstile = turnstileServerConfig(
    process.env.NODE_ENV,
    String(config.turnstileSecretKey || process.env.TURNSTILE_SECRET_KEY || ""),
  );
  const turnstile = {
    mode: serverTurnstile.mode,
    siteKeyReady: publicTurnstile.enabled,
    secretReady: serverTurnstile.enabled,
    allowedHostnames: turnstileAllowedHostnames(),
    trustedProxyHeaders: process.env.TRUST_PROXY_HEADERS === "true",
  };
  const ready = readiness.ready;
  const wantsProbe = new URL(request.url).searchParams.get("probe") === "1";
  let activeProbe: { success: boolean; latencyMs?: number; code?: string } | undefined;
  if (wantsProbe) {
    const expected = process.env.ASSESSMENT_HEALTH_PROBE_TOKEN?.trim();
    if (!expected || request.headers.get("x-health-probe-token") !== expected)
      return NextResponse.json({ error: "Unauthorized health probe" }, { status: 401 });
    try {
      const probe = await probeLiveKitAgent(config, crypto.randomUUID());
      activeProbe = { success: true, latencyMs: probe.latencyMs };
    } catch (error) {
      activeProbe = {
        success: false,
        code: error instanceof Error ? error.name : "PROBE_FAILED",
      };
    }
  }
  const operational = ready && (!wantsProbe || activeProbe?.success === true);
  return NextResponse.json(
    {
      status: operational ? "ready" : "not-ready",
      provider,
      code: readiness.code,
      issues: readiness.issues,
      checks: {
        credentialsReady,
        projectMatch,
        workerSecretReady,
        geminiReady: Boolean(config.geminiApiKey),
        configurationSource: process.env.ADMIN_API_SECRET ? "convex-env" : "env-fallback",
        turnstile,
        activeProbe,
      },
    },
    { status: operational ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
