import { NextResponse } from "next/server";
import { parseClientDiagnostic } from "@/lib/assessment/client-diagnostic";
import { verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import { allowRequest } from "@/lib/server/rate-limit";
import { convexMutation } from "@/lib/server/convex";
import { telemetryRetentionMs } from "@/lib/assessment/telemetry";
import { runtimeConfig } from "@/lib/server/runtime-config";

export async function POST(request: Request) {
  await runtimeConfig();
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const verified = verifyAssessmentToken(token, "progress");
  if (!verified?.assessmentId)
    return NextResponse.json({ error: "Invalid or expired assessment token" }, { status: 401 });

  let payload: ReturnType<typeof parseClientDiagnostic>;
  try {
    payload = parseClientDiagnostic(await request.json());
  } catch {
    payload = null;
  }
  if (!payload) return NextResponse.json({ error: "Invalid diagnostic event" }, { status: 400 });
  if (!payload.roomName.startsWith(`assessment-${verified.assessmentId}-`))
    return NextResponse.json({ error: "Assessment room mismatch" }, { status: 403 });
  if (!(await allowRequest(`assessment-diagnostic:${verified.assessmentId}`, 120, 60 * 60_000)))
    return NextResponse.json({ error: "Diagnostic rate limit exceeded" }, { status: 429 });

  console.info(
    JSON.stringify({
      service: "assessment-client",
      assessmentId: verified.assessmentId,
      ...payload,
    }),
  );
  const createdAt = Date.now();
  await convexMutation("assessments:recordTelemetry", {
    eventId: crypto.randomUUID(),
    assessmentId: verified.assessmentId,
    supportId: payload.supportId,
    sessionKey: payload.sessionKey,
    source: "client",
    event: payload.event,
    turnId: payload.turnId,
    state: payload.state || payload.playbackState,
    code: payload.code,
    durationMs: payload.durationMs,
    createdAt,
    expiresAt: createdAt + telemetryRetentionMs,
  });
  return new NextResponse(null, { status: 204 });
}
