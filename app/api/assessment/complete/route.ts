import { NextResponse } from "next/server";
import { assessmentCompleteSchema } from "@/lib/validations/assessment";
import { convexMutation } from "@/lib/server/convex";
import { convexQuery } from "@/lib/server/convex";
import { buildAssessmentReport } from "@/lib/server/assessment-report";
import type { AssessmentSnapshot } from "@/lib/assessment/types";
import { verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import { redactSensitiveText } from "@/lib/assessment/data-policy";
import { runtimeConfig } from "@/lib/server/runtime-config";

export async function POST(request: Request) {
  await runtimeConfig();
  const authorization = request.headers.get("authorization");
  const verified = verifyAssessmentToken(
    authorization?.startsWith("Bearer ") ? authorization.slice(7) : "",
    "progress",
  );
  if (!verified?.assessmentId)
    return NextResponse.json({ error: "Invalid or expired assessment token" }, { status: 401 });
  let assessmentId: string | undefined;
  try {
    const parsed = assessmentCompleteSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid assessment result" }, { status: 400 });
    assessmentId = parsed.data.assessmentId;
    if (verified.assessmentId !== assessmentId)
      return NextResponse.json({ error: "Assessment mismatch" }, { status: 403 });
    const stored = (await convexQuery("assessments:getState", {
      assessmentId: parsed.data.assessmentId,
    })) as {
      snapshot?: AssessmentSnapshot;
      provider?: string;
      lead?: { locale?: "es" | "en" };
    } | null;
    if (!stored) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    const claimed = await convexMutation("assessments:claimFinalization", {
      assessmentId: parsed.data.assessmentId,
      now: Date.now(),
    });
    if (!claimed)
      return NextResponse.json({ ok: true, reviewPending: true, duplicate: true }, { status: 202 });
    const transcript = redactSensitiveText(parsed.data.transcript).text;
    const locale = stored.lead?.locale || parsed.data.locale;
    const result = await buildAssessmentReport(stored.snapshot, transcript, locale);
    await convexMutation("assessments:complete", {
      assessmentId: parsed.data.assessmentId,
      sessionKey: parsed.data.sessionKey,
      transcript,
      provider: stored.provider || parsed.data.provider,
      durationSeconds: parsed.data.durationSeconds,
      result,
      completionReason: "client-ended",
      completedAt: Date.now(),
    });
    const adminApiSecret = process.env.ADMIN_API_SECRET?.trim();
    if (adminApiSecret) {
      await convexMutation("funnel:track", {
        serviceSecret: adminApiSecret,
        sessionId: parsed.data.assessmentId,
        locale,
        name: "assessment_completed",
        assessmentId: parsed.data.assessmentId,
        createdAt: Date.now(),
      });
    }
    return NextResponse.json({ ok: true, reviewPending: true });
  } catch (error) {
    console.error("[assessment:complete]", error);
    if (assessmentId)
      try {
        await convexMutation("assessments:failFinalization", {
          assessmentId,
          error: error instanceof Error ? error.message : "unknown",
        });
      } catch {
        /* best effort */
      }
    return NextResponse.json({ error: "The assessment could not be completed." }, { status: 500 });
  }
}
