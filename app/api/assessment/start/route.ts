import { NextResponse } from "next/server";
import {
  assessmentConferenceStartSchema,
  assessmentIntakeSchema,
  type AssessmentIntake,
} from "@/lib/validations/assessment";
import { convexMutation } from "@/lib/server/convex";
import { allowRequest } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { createAssessmentSnapshot } from "@/lib/assessment/engine";
import { voiceProviderIds, type AssessmentSnapshot, type VoiceProviderId } from "@/lib/assessment/types";
import { createVoiceSession, interviewFrameworkVersion } from "@/lib/server/voice";
import { assessmentTokenHash, progressToken, resumeToken, verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import { runtimeConfig } from "@/lib/server/runtime-config";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!allowRequest(`assessment:${ip}`, 5)) {
      return NextResponse.json(
        { error: "Too many assessment attempts. Please try again later." },
        { status: 429 },
      );
    }
    const distributedAllowed = await convexMutation("assessments:checkRateLimit", { key: `start:${ip}`, limit: 5, windowMs: 60 * 60_000, now: Date.now() });
    if (distributedAllowed === false) return NextResponse.json({ error: "Too many assessment attempts. Please try again later." }, { status: 429 });

    const body = await request.json();
    const conferenceStart = body?.mode === "conference";
    let intake: AssessmentIntake;
    let turnstileToken: string | undefined;

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
      const { website: _website, turnstileToken: _turnstileToken, ...submittedIntake } = parsed.data;
      void _website;
      void _turnstileToken;
      intake = submittedIntake;
    }

    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: "Human verification failed" }, { status: 403 });
    }

    const resume = conferenceStart && body.resumeToken ? verifyAssessmentToken(body.resumeToken, "resume") : null;
    const assessmentId = resume?.assessmentId || crypto.randomUUID();
    const override = conferenceStart && body.providerOverrideToken ? verifyAssessmentToken(body.providerOverrideToken, "provider-override") : null;
    const dynamicConfig = await runtimeConfig();
    const configuredDefault = dynamicConfig.defaultProvider as VoiceProviderId | undefined;
    const candidateProvider = override?.provider || configuredDefault || process.env.VOICE_PROVIDER || "ultravox";
    const provider: VoiceProviderId = voiceProviderIds.includes(candidateProvider as VoiceProviderId) ? candidateProvider as VoiceProviderId : "ultravox";
    const previous = resume?.assessmentId ? await convexMutation("assessments:consumeResumeCredential", { assessmentId, tokenHash: assessmentTokenHash(body.resumeToken), now: Date.now() }) as { snapshot?: AssessmentSnapshot; lead?: { locale?: "es" | "en"; firstName?: string } } | null : null;
    if (resume?.assessmentId && !previous) return NextResponse.json({ error: "This resume link is invalid, expired, or has already been used." }, { status: 401 });
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
    const resumeSummary = previous?.snapshot ? JSON.stringify({ fields: previous.snapshot.fields, essentialMissing: previous.snapshot.essentialMissing, coverageScore: previous.snapshot.coverageScore }) : undefined;
    const sessionProgressToken = progressToken(assessmentId);
    const sessionKey = crypto.randomUUID();
    const session = await createVoiceSession(provider, { assessmentId, sessionKey, locale: intake.locale, name: previous?.lead?.firstName || intake.firstName, progressToken: sessionProgressToken, resumeSummary });
    const providerSessionId = session.provider === "ultravox" ? session.callId : session.provider === "livekit" ? session.roomName : session.provider === "gemini-live" ? sessionKey : undefined;
    const providerModel = session.provider === "gemini-live" ? session.model : provider === "livekit" ? dynamicConfig.geminiLiveModel : dynamicConfig.ultravoxModel;
    const providerVoice = provider === "ultravox" ? dynamicConfig.ultravoxVoice : dynamicConfig.geminiLiveVoice;
    await convexMutation("assessments:setProviderSession", { assessmentId, sessionKey, provider: session.provider === "demo" ? provider : session.provider, providerSessionId, providerModel, providerVoice, frameworkVersion: interviewFrameworkVersion, startedAt: Date.now() });
    const nextResumeToken = resumeToken(assessmentId);
    await convexMutation("assessments:setResumeCredential", { assessmentId, tokenHash: assessmentTokenHash(nextResumeToken), expiresAt: Date.now() + 24 * 60 * 60_000 });
    await convexMutation("funnel:track", {
      sessionId: assessmentId,
      locale: intake.locale,
      name: "assessment_started",
      assessmentId,
      createdAt: Date.now(),
    });
    return NextResponse.json({
      ...session,
      contactEmail: conferenceStart ? undefined : intake.email,
      locale: intake.locale,
      progressToken: sessionProgressToken,
      resumeToken: nextResumeToken,
      sessionKey,
      snapshot,
    });
  } catch (error) {
    console.error("[assessment:start]", error);
    return NextResponse.json(
      { error: "The assessment could not be started." },
      { status: 502 },
    );
  }
}
