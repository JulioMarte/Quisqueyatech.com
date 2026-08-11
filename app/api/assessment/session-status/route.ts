import { NextResponse } from "next/server";
import { convexQuery } from "@/lib/server/convex";
import { convexMutation } from "@/lib/server/convex";
import { verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import { bearerToken, isTrustedAssessmentWorker } from "@/lib/server/worker-auth";
import { runtimeConfig } from "@/lib/server/runtime-config";

const publicStatuses = new Set([
  "in_progress",
  "finalizing",
  "completed",
  "interrupted",
  "finalization_failed",
]);

export async function GET(request: Request) {
  await runtimeConfig();
  const verified = verifyAssessmentToken(bearerToken(request), "progress");
  const url = new URL(request.url);
  const assessmentId = url.searchParams.get("assessmentId") || "";
  const sessionKey = url.searchParams.get("sessionKey") || "";
  if (!verified?.assessmentId)
    return NextResponse.json({ error: "Invalid or expired assessment token" }, { status: 401 });
  if (verified.assessmentId !== assessmentId || !sessionKey)
    return NextResponse.json({ error: "Assessment mismatch" }, { status: 403 });

  const state = (await convexQuery("assessments:getFinalizationState", {
    assessmentId,
    sessionKey,
  })) as { assessmentStatus: string; completionReason?: string; sessionStatus: string } | null;
  if (!state) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const raw = state.assessmentStatus;
  const status =
    raw === "completed" || raw === "finalizing" || raw === "finalization_failed"
      ? raw
      : state.sessionStatus === "interrupted" || state.sessionStatus === "recovering"
        ? "interrupted"
        : publicStatuses.has(raw)
          ? raw
          : "in_progress";
  const publicReasons = new Set([
    "assessment-completed",
    "user-requested-end",
    "hard-time-limit",
    "client-ended",
    "close",
  ]);
  return NextResponse.json({
    status,
    reason:
      status === "finalization_failed"
        ? "FINALIZATION_FAILED"
        : state.completionReason && publicReasons.has(state.completionReason)
          ? state.completionReason
          : null,
    resultAvailable: status === "completed",
  });
}

export async function POST(request: Request) {
  if (!(await isTrustedAssessmentWorker(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  if (
    typeof body.assessmentId !== "string" ||
    typeof body.sessionKey !== "string" ||
    typeof body.completionReason !== "string" ||
    body.completionReason.length > 80
  )
    return NextResponse.json({ error: "Invalid finalization state" }, { status: 400 });
  await convexMutation("assessments:markSessionFinalizing", {
    assessmentId: body.assessmentId,
    sessionKey: body.sessionKey,
    completionReason: body.completionReason,
    now: Date.now(),
  });
  return NextResponse.json({ status: "finalizing" });
}
