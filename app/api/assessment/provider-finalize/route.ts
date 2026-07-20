import { NextResponse } from "next/server";
import { z } from "zod";
import { redactSensitiveText } from "@/lib/assessment/data-policy";
import type { AssessmentSnapshot } from "@/lib/assessment/types";
import { buildAssessmentReport } from "@/lib/server/assessment-report";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { shouldFinalizeProviderSession } from "@/lib/assessment/finalization";

const schema = z.object({
  assessmentId: z.string().uuid(),
  sessionKey: z.string().uuid(),
  provider: z.enum(["livekit", "gemini-live"]),
  transcript: z.string().max(100_000),
  sessionReport: z.unknown(),
  durationSeconds: z.number().int().min(0).max(1_000),
  completionReason: z.string().max(200),
  finalizeAssessment: z.boolean(),
});

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/, "") || "";
  if (!process.env.ASSESSMENT_WORKER_SECRET || token !== process.env.ASSESSMENT_WORKER_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const transcript = redactSensitiveText(parsed.data.transcript).text;
  const finalizationState = (await convexQuery("assessments:getFinalizationState", {
    assessmentId: parsed.data.assessmentId,
    sessionKey: parsed.data.sessionKey,
  })) as {
    assessmentStatus: string;
    completionReason?: string;
    sessionStatus: string;
  } | null;
  const recovering = finalizationState?.sessionStatus === "recovering";
  const finalizeAssessment = shouldFinalizeProviderSession({
    requested: parsed.data.finalizeAssessment,
    sessionStatus: finalizationState?.sessionStatus,
    completionReason: finalizationState?.completionReason,
  });
  await convexMutation("assessments:storeSessionReport", {
    sessionKey: parsed.data.sessionKey,
    transcript,
    report: parsed.data.sessionReport,
    endedAt: Date.now(),
    durationSeconds: parsed.data.durationSeconds,
    completionReason: parsed.data.completionReason,
    status: finalizeAssessment ? "ended" : recovering ? "recovered" : "interrupted",
  });
  if (!finalizeAssessment) return NextResponse.json({ ok: true, interrupted: true });
  const claimed = await convexMutation("assessments:claimFinalization", {
    assessmentId: parsed.data.assessmentId,
    now: Date.now(),
  });
  if (!claimed) return NextResponse.json({ ok: true, duplicate: true });
  try {
    const stored = (await convexQuery("assessments:getState", {
      assessmentId: parsed.data.assessmentId,
    })) as { snapshot?: AssessmentSnapshot; lead?: { locale?: "es" | "en" } } | null;
    const result = await buildAssessmentReport(
      stored?.snapshot,
      transcript,
      stored?.lead?.locale || "es",
    );
    await convexMutation("assessments:complete", {
      assessmentId: parsed.data.assessmentId,
      sessionKey: parsed.data.sessionKey,
      transcript,
      provider: parsed.data.provider,
      durationSeconds: parsed.data.durationSeconds,
      result,
      completionReason: parsed.data.completionReason,
      completedAt: Date.now(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await convexMutation("assessments:failFinalization", {
      assessmentId: parsed.data.assessmentId,
      error: error instanceof Error ? error.message : "provider finalization failed",
    });
    return NextResponse.json({ error: "Finalization failed" }, { status: 503 });
  }
}
