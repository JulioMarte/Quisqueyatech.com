import { NextResponse } from "next/server";
import {
  assessmentConferenceStartSchema,
  assessmentIntakeSchema,
  type AssessmentIntake,
} from "@/lib/validations/assessment";
import { convexMutation } from "@/lib/server/convex";
import { checkRequestLimit } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { createAssessmentSnapshot } from "@/lib/assessment/engine";
import type { AssessmentSnapshot } from "@/lib/assessment/types";
import {
  createVoiceSession,
  defaultGeminiLiveModel,
  defaultGeminiLiveVoice,
  interviewFrameworkVersion,
  providerConfigured,
} from "@/lib/server/voice";
import {
  assessmentTokenHash,
  progressToken,
  resumeToken,
  verifyAssessmentToken,
} from "@/lib/server/assessment-tokens";
import { runtimeConfig } from "@/lib/server/runtime-config";
import { requestIp } from "@/lib/server/request-ip";
import { requestFingerprint } from "@/lib/server/auth";
import { AuthConfigError, classifyAuthError } from "@/lib/server/auth-errors";
import { LiveKitDispatchError } from "@/lib/livekit/dispatch-core";
import { diagnosticLog, errorSummary } from "@/lib/server/diagnostic-log";

function requiredLocalCloudVariables() {
  const missing: string[] = [];
  if (!(process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim()))
    missing.push("CONVEX_URL or NEXT_PUBLIC_CONVEX_URL");
  if (!(process.env.CONVEX_SITE_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim()))
    missing.push("CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_SITE_URL");
  for (const key of [
    "ADMIN_API_SECRET",
    "ASSESSMENT_STORAGE_SECRET",
    "ASSESSMENT_TOKEN_SECRET",
    "CONFIG_ENCRYPTION_KEY",
    "ASSESSMENT_WORKER_SECRET",
  ] as const) {
    if (!process.env[key]?.trim()) missing.push(key);
  }
  return missing;
}

function localCloudTestingEnabled() {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "";
  return process.env.NODE_ENV !== "production" && /^https:\/\/.+\.convex\.cloud/i.test(convexUrl);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestSupportId = crypto.randomUUID();
  let assessmentIdForLog: string | undefined;
  let roomNameForLog: string | undefined;
  let localeForLog: "es" | "en" | undefined;
  try {
    diagnosticLog("assessment-start", "request_received", {
      supportId: requestSupportId,
      userAgent: request.headers.get("user-agent") ? "present" : "missing",
    });
    if (localCloudTestingEnabled()) {
      const missing = requiredLocalCloudVariables();
      if (missing.length) {
        diagnosticLog(
          "assessment-start",
          "local_cloud_env_missing",
          { supportId: requestSupportId, missing, durationMs: Date.now() - startedAt },
          "error",
        );
        return NextResponse.json(
          {
            error: "El entorno local apunta a Convex Cloud, pero faltan variables runtime locales.",
            code: "LOCAL_CLOUD_ENV_MISSING",
            missing,
            supportId: requestSupportId,
          },
          { status: 503 },
        );
      }
    }
    const ip = requestIp(request);
    const edgeLimit = await checkRequestLimit(
      requestFingerprint(request, "assessment-edge"),
      100,
      10 * 60_000,
    );
    diagnosticLog("assessment-start", "edge_rate_limit_checked", {
      supportId: requestSupportId,
      allowed: edgeLimit.allowed,
      retryAfter: edgeLimit.retryAfter,
      durationMs: Date.now() - startedAt,
    });
    if (!edgeLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests from this network. Please try again shortly.",
          code: "RATE_LIMITED",
          retryAfter: edgeLimit.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(edgeLimit.retryAfter) } },
      );
    }

    const body = await request.json();
    const conferenceStart = body?.mode === "conference";
    diagnosticLog("assessment-start", "request_body_classified", {
      supportId: requestSupportId,
      conferenceStart,
      hasResumeToken: Boolean(body?.resumeToken),
      durationMs: Date.now() - startedAt,
    });
    let intake: AssessmentIntake;
    let turnstileToken: string | undefined;
    let visitorId: string | undefined;

    if (conferenceStart) {
      const parsed = assessmentConferenceStartSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: parsed.error.issues[0]?.message || "Invalid conference request",
            issues: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }
      const temporaryId = crypto.randomUUID();
      turnstileToken = parsed.data.turnstileToken;
      visitorId = parsed.data.visitorId;
      localeForLog = parsed.data.locale;
      intake = {
        firstName: parsed.data.locale === "es" ? "Visitante" : "Guest",
        lastName: "Web",
        company: "No informado",
        role: "No informado",
        country: "No informado",
        locale: parsed.data.locale,
        email: `voice-${temporaryId}@anonymous.invalid`,
        phone: "+10000000000",
        processingConsent: true,
        recordingConsent: true,
      };
    } else {
      const parsed = assessmentIntakeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: parsed.error.issues[0]?.message || "Invalid assessment intake",
            issues: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }
      if (parsed.data.website) {
        return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
      }
      turnstileToken = parsed.data.turnstileToken;
      const {
        website: _website,
        turnstileToken: _turnstileToken,
        ...submittedIntake
      } = parsed.data;
      void _website;
      void _turnstileToken;
      intake = submittedIntake;
      localeForLog = intake.locale;
    }

    if (!(await providerConfigured("livekit"))) {
      diagnosticLog(
        "assessment-start",
        "provider_not_configured",
        { supportId: requestSupportId, provider: "livekit", durationMs: Date.now() - startedAt },
        "error",
      );
      return NextResponse.json(
        {
          error:
            intake.locale === "es"
              ? "LiveKit no está configurado. Revisa las credenciales del proveedor en /admin y el secreto del worker en el entorno del servidor."
              : "LiveKit is not configured. Check provider credentials in /admin and the worker secret in the server environment.",
          code: "LIVEKIT_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const turnstile = await verifyTurnstile(turnstileToken, ip, "assessment_start");
    diagnosticLog("assessment-start", "turnstile_checked", {
      supportId: requestSupportId,
      ok: turnstile.ok,
      code: turnstile.ok ? "OK" : turnstile.code,
      turnstileSupportId: turnstile.supportId,
      durationMs: Date.now() - startedAt,
    });
    if (!turnstile.ok) {
      return NextResponse.json(
        {
          error:
            intake.locale === "es"
              ? "No pudimos confirmar la verificación humana. Vuelve a intentarlo."
              : "We could not confirm human verification. Please try again.",
          code: turnstile.code,
          supportId: turnstile.supportId,
        },
        { status: turnstile.code === "TURNSTILE_UNAVAILABLE" ? 503 : 403 },
      );
    }

    const startLimit = await checkRequestLimit(
      `${requestFingerprint(request, "assessment-start")}:${visitorId || "legacy"}`,
      12,
      60 * 60_000,
    );
    diagnosticLog("assessment-start", "start_rate_limit_checked", {
      supportId: requestSupportId,
      allowed: startLimit.allowed,
      retryAfter: startLimit.retryAfter,
      visitorId: visitorId ? "present" : "missing",
      durationMs: Date.now() - startedAt,
    });
    if (!startLimit.allowed) {
      return NextResponse.json(
        {
          error:
            intake.locale === "es"
              ? "Alcanzaste el límite de conferencias de este navegador. Inténtalo más tarde."
              : "This browser has reached its conference limit. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: startLimit.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(startLimit.retryAfter) } },
      );
    }

    const resume =
      conferenceStart && body.resumeToken
        ? verifyAssessmentToken(body.resumeToken, "resume")
        : null;
    const assessmentId = resume?.assessmentId || crypto.randomUUID();
    assessmentIdForLog = assessmentId;
    diagnosticLog("assessment-start", "assessment_id_ready", {
      supportId: requestSupportId,
      assessmentId,
      resumed: Boolean(resume?.assessmentId),
      locale: localeForLog,
      durationMs: Date.now() - startedAt,
    });
    const dynamicConfig = await runtimeConfig();
    diagnosticLog("assessment-start", "runtime_config_loaded", {
      supportId: requestSupportId,
      assessmentId,
      fields: {
        livekitUrl: Boolean(dynamicConfig.livekitUrl),
        livekitApiKey: Boolean(dynamicConfig.livekitApiKey),
        livekitApiSecret: Boolean(dynamicConfig.livekitApiSecret),
        geminiApiKey: Boolean(dynamicConfig.geminiApiKey),
        assessmentWorkerSecret: Boolean(process.env.ASSESSMENT_WORKER_SECRET?.trim()),
      },
      durationMs: Date.now() - startedAt,
    });
    const provider = "livekit" as const;
    const previous = resume?.assessmentId
      ? ((await convexMutation("assessments:consumeResumeCredential", {
          assessmentId,
          tokenHash: assessmentTokenHash(body.resumeToken),
          now: Date.now(),
        })) as {
          snapshot?: AssessmentSnapshot;
          lead?: { locale?: "es" | "en"; firstName?: string };
        } | null)
      : null;
    if (resume?.assessmentId && !previous)
      return NextResponse.json(
        { error: "This resume link is invalid, expired, or has already been used." },
        { status: 401 },
      );
    const snapshot = previous?.snapshot || createAssessmentSnapshot(intake.locale);
    await convexMutation("assessments:create", {
      assessmentId,
      ...intake,
      mode: "now",
      provider,
      frameworkVersion: interviewFrameworkVersion,
      snapshot,
      createdAt: Date.now(),
      audioExpiresAt: Date.now() + 30 * 86400000,
      transcriptExpiresAt: Date.now() + 90 * 86400000,
      leadExpiresAt: Date.now() + 365 * 86400000,
      resumeExpiresAt: Date.now() + 24 * 60 * 60_000,
      consentVersion: "voice-assessment-2026-07-v1",
    });
    diagnosticLog("assessment-start", "assessment_created", {
      supportId: requestSupportId,
      assessmentId,
      provider,
      durationMs: Date.now() - startedAt,
    });
    const resumeSummary = previous?.snapshot
      ? JSON.stringify({
          fields: previous.snapshot.fields,
          essentialMissing: previous.snapshot.essentialMissing,
          coverageScore: previous.snapshot.coverageScore,
        })
      : undefined;
    const sessionProgressToken = progressToken(assessmentId);
    const sessionKey = crypto.randomUUID();
    const session = await createVoiceSession(provider, {
      assessmentId,
      sessionKey,
      locale: intake.locale,
      name: previous?.lead?.firstName || intake.firstName,
      progressToken: sessionProgressToken,
      resumeSummary,
    });
    if (session.provider === "livekit") roomNameForLog = session.roomName;
    diagnosticLog("assessment-start", "voice_session_created", {
      supportId: session.provider === "livekit" ? session.supportId : requestSupportId,
      requestSupportId,
      assessmentId,
      provider: session.provider,
      roomName: session.provider === "livekit" ? session.roomName : undefined,
      dispatchId: session.provider === "livekit" ? session.dispatchId : undefined,
      durationMs: Date.now() - startedAt,
    });
    const providerSessionId =
      session.provider === "ultravox"
        ? session.callId
        : session.provider === "livekit"
          ? session.roomName
          : session.provider === "gemini-live"
            ? sessionKey
            : undefined;
    const providerModel = String(dynamicConfig.geminiLiveModel || defaultGeminiLiveModel);
    const providerVoice = String(dynamicConfig.geminiLiveVoice || defaultGeminiLiveVoice);
    await convexMutation("assessments:setProviderSession", {
      assessmentId,
      sessionKey,
      provider: session.provider === "demo" ? provider : session.provider,
      providerSessionId,
      supportId: session.provider === "livekit" ? session.supportId : undefined,
      providerModel,
      providerVoice,
      frameworkVersion: interviewFrameworkVersion,
      startedAt: Date.now(),
    });
    diagnosticLog("assessment-start", "provider_session_recorded", {
      supportId: session.provider === "livekit" ? session.supportId : requestSupportId,
      requestSupportId,
      assessmentId,
      provider: session.provider,
      roomName: session.provider === "livekit" ? session.roomName : undefined,
      durationMs: Date.now() - startedAt,
    });
    const nextResumeToken = resumeToken(assessmentId);
    await convexMutation("assessments:setResumeCredential", {
      assessmentId,
      tokenHash: assessmentTokenHash(nextResumeToken),
      expiresAt: Date.now() + 24 * 60 * 60_000,
    });
    diagnosticLog("assessment-start", "resume_credential_recorded", {
      supportId: session.provider === "livekit" ? session.supportId : requestSupportId,
      requestSupportId,
      assessmentId,
      durationMs: Date.now() - startedAt,
    });
    const adminApiSecret = process.env.ADMIN_API_SECRET?.trim();
    if (adminApiSecret) {
      await convexMutation("funnel:track", {
        serviceSecret: adminApiSecret,
        sessionId: assessmentId,
        locale: intake.locale,
        name: "assessment_started",
        assessmentId,
        createdAt: Date.now(),
      });
    }
    if (session.provider !== "livekit") throw new Error("LiveKit session was not created");
    diagnosticLog("assessment-start", "response_ready", {
      supportId: session.supportId,
      requestSupportId,
      assessmentId,
      roomName: session.roomName,
      provider: session.provider,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      provider: session.provider,
      assessmentId: session.assessmentId,
      roomUrl: session.roomUrl,
      token: session.token,
      roomName: session.roomName,
      supportId: session.supportId,
      progressToken: sessionProgressToken,
      resumeToken: nextResumeToken,
      sessionKey,
    });
  } catch (error) {
    console.error("[assessment:start]", error);
    if (error instanceof AuthConfigError) {
      const classified = classifyAuthError(error);
      diagnosticLog(
        "assessment-start",
        "auth_config_error",
        {
          supportId: requestSupportId,
          assessmentId: assessmentIdForLog,
          roomName: roomNameForLog,
          code: classified.code,
          error: errorSummary(error),
          durationMs: Date.now() - startedAt,
        },
        "error",
      );
      return NextResponse.json(
        { error: classified.publicMessage, code: classified.code, supportId: requestSupportId },
        { status: classified.status },
      );
    }
    if (error instanceof LiveKitDispatchError) {
      diagnosticLog(
        "assessment-start",
        "livekit_error",
        {
          supportId: error.supportId,
          requestSupportId,
          assessmentId: assessmentIdForLog,
          roomName: error.roomName || roomNameForLog,
          code: error.code,
          error: errorSummary(error),
          durationMs: Date.now() - startedAt,
        },
        "error",
      );
      return NextResponse.json(
        {
          error: "The LiveKit agent is temporarily unavailable.",
          code: error.code,
          supportId: error.supportId,
        },
        { status: 503 },
      );
    }
    diagnosticLog(
      "assessment-start",
      "request_failed",
      {
        supportId: requestSupportId,
        assessmentId: assessmentIdForLog,
        roomName: roomNameForLog,
        error: errorSummary(error),
        durationMs: Date.now() - startedAt,
      },
      "error",
    );
    return NextResponse.json({ error: "The assessment could not be started." }, { status: 502 });
  }
}
