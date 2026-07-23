import { NextResponse } from "next/server";
import { z } from "zod";
import type { AssessmentSnapshot } from "@/lib/assessment/types";
import { telemetryRetentionMs } from "@/lib/assessment/telemetry";
import { safeDeleteRoom } from "@/lib/livekit/dispatch-core";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { createLiveKitClients } from "@/lib/server/livekit";
import { allowRequest } from "@/lib/server/rate-limit";
import { runtimeConfig } from "@/lib/server/runtime-config";
import { verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import {
  createVoiceSession,
  defaultGeminiLiveModel,
  defaultGeminiLiveVoice,
  interviewFrameworkVersion,
  issueLiveKitParticipantToken,
} from "@/lib/server/voice";

const schema = z
  .object({
    roomName: z.string().min(20).max(180),
    sessionKey: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

type StoredState = {
  snapshot?: AssessmentSnapshot;
  lead?: { firstName?: string; locale?: "es" | "en" };
};

async function recordServerEvent(
  assessmentId: string,
  supportId: string,
  sessionKey: string,
  event: "recovery_started" | "session_recovered" | "recovery_failed",
  code?: string,
) {
  const createdAt = Date.now();
  await convexMutation("assessments:recordTelemetry", {
    eventId: crypto.randomUUID(),
    assessmentId,
    supportId,
    sessionKey,
    source: "server",
    event,
    code,
    createdAt,
    expiresAt: createdAt + telemetryRetentionMs,
  });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const verified = verifyAssessmentToken(token, "progress");
  if (!verified?.assessmentId)
    return NextResponse.json({ error: "Invalid or expired assessment token" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid recovery request" }, { status: 400 });
  const expectedRoom = `assessment-${verified.assessmentId}-${parsed.data.sessionKey}`;
  if (parsed.data.roomName !== expectedRoom)
    return NextResponse.json({ error: "Assessment room mismatch" }, { status: 403 });
  if (!(await allowRequest(`assessment-recovery:${verified.assessmentId}`, 2, 60 * 60_000)))
    return NextResponse.json(
      { error: "Recovery limit exceeded", code: "recovery_failed" },
      { status: 429 },
    );

  const oldSession = (await convexQuery("assessments:getSessionByKey", {
    assessmentId: verified.assessmentId,
    sessionKey: parsed.data.sessionKey,
  })) as { supportId?: string } | null;
  if (!oldSession)
    return NextResponse.json(
      { error: "Session cannot be recovered", code: "recovery_failed" },
      { status: 404 },
    );

  const replacementSessionKey = crypto.randomUUID();
  let claim: { claimed: boolean; replacementSessionKey?: string };
  try {
    claim = (await convexMutation("assessments:beginSessionRecovery", {
      assessmentId: verified.assessmentId,
      sessionKey: parsed.data.sessionKey,
      recoveryKey: parsed.data.idempotencyKey,
      replacementSessionKey,
    })) as typeof claim;
  } catch {
    return NextResponse.json(
      { error: "Session cannot be recovered", code: "recovery_failed" },
      { status: 409 },
    );
  }
  const nextSessionKey = claim.replacementSessionKey || replacementSessionKey;
  const existing = (await convexQuery("assessments:getSessionByKey", {
    assessmentId: verified.assessmentId,
    sessionKey: nextSessionKey,
  })) as {
    providerSessionId?: string;
    supportId?: string;
  } | null;
  const stored = (await convexQuery("assessments:getState", {
    assessmentId: verified.assessmentId,
  })) as StoredState | null;
  const locale = stored?.lead?.locale || "es";
  const name = stored?.lead?.firstName || (locale === "es" ? "Visitante" : "Guest");

  if (existing?.providerSessionId) {
    const credentials = await issueLiveKitParticipantToken({
      assessmentId: verified.assessmentId,
      sessionKey: nextSessionKey,
      locale,
      name,
      roomName: existing.providerSessionId,
    });
    return NextResponse.json({
      provider: "livekit",
      assessmentId: verified.assessmentId,
      sessionKey: nextSessionKey,
      roomName: existing.providerSessionId,
      supportId: existing.supportId || parsed.data.idempotencyKey,
      ...credentials,
    });
  }

  const oldSupportId = oldSession.supportId || parsed.data.idempotencyKey;
  try {
    await recordServerEvent(
      verified.assessmentId,
      oldSupportId,
      parsed.data.sessionKey,
      "recovery_started",
    );
    const config = await runtimeConfig();
    const { clients } = createLiveKitClients(config);
    await safeDeleteRoom(clients, parsed.data.roomName);
    const resumeSummary = stored?.snapshot
      ? JSON.stringify({
          fields: stored.snapshot.fields,
          essentialMissing: stored.snapshot.essentialMissing,
          coverageScore: stored.snapshot.coverageScore,
        })
      : undefined;
    const session = await createVoiceSession(
      "livekit",
      {
        assessmentId: verified.assessmentId,
        sessionKey: nextSessionKey,
        locale,
        name,
        progressToken: token,
        resumeSummary,
      },
      config,
    );
    if (session.provider !== "livekit") throw new Error("LiveKit recovery dispatch failed");
    await convexMutation("assessments:setProviderSession", {
      assessmentId: verified.assessmentId,
      sessionKey: nextSessionKey,
      provider: "livekit",
      providerSessionId: session.roomName,
      supportId: session.supportId,
      providerModel: String(config.geminiLiveModel || defaultGeminiLiveModel),
      providerVoice: String(config.geminiLiveVoice || defaultGeminiLiveVoice),
      frameworkVersion: interviewFrameworkVersion,
      startedAt: Date.now(),
    });
    await recordServerEvent(
      verified.assessmentId,
      session.supportId,
      nextSessionKey,
      "session_recovered",
    );
    return NextResponse.json({
      provider: session.provider,
      assessmentId: session.assessmentId,
      roomUrl: session.roomUrl,
      token: session.token,
      roomName: session.roomName,
      supportId: session.supportId,
      sessionKey: nextSessionKey,
    });
  } catch (error) {
    await recordServerEvent(
      verified.assessmentId,
      oldSupportId,
      nextSessionKey,
      "recovery_failed",
      error instanceof Error ? error.name.slice(0, 80) : "unknown",
    ).catch(() => undefined);
    return NextResponse.json(
      { error: "The agent could not be recovered", code: "recovery_failed" },
      { status: 503 },
    );
  }
}
