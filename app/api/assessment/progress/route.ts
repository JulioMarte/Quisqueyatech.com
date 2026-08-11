import { NextResponse } from "next/server";
import { enforceAssessmentDataPolicy } from "@/lib/assessment/data-policy";
import { convexMutation } from "@/lib/server/convex";
import { verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import { assessmentProgressSchema } from "@/lib/validations/assessment";
import { bearerToken, isTrustedAssessmentWorker } from "@/lib/server/worker-auth";
import { runtimeConfig } from "@/lib/server/runtime-config";

export async function POST(request: Request) {
  await runtimeConfig();
  const token = bearerToken(request);
  const verified = verifyAssessmentToken(token, "progress");
  const trustedWorker = await isTrustedAssessmentWorker(request);
  if (!verified?.assessmentId && !trustedWorker)
    return NextResponse.json({ error: "Invalid or expired assessment token" }, { status: 401 });
  const parsed = assessmentProgressSchema.safeParse(await request.json());
  if (!parsed.success || (!trustedWorker && parsed.data.assessmentId !== verified?.assessmentId))
    return NextResponse.json(
      { error: parsed.success ? "Assessment mismatch" : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  try {
    const policy = enforceAssessmentDataPolicy(parsed.data.updates || []);
    const input = { ...parsed.data, updates: policy.updates };
    const output = await convexMutation("assessments:advance", {
      assessmentId: parsed.data.assessmentId,
      sessionKey: parsed.data.sessionKey,
      input,
      alerts: policy.alerts,
      now: Date.now(),
    });
    if (!output) throw new Error("Assessment storage is unavailable");
    return NextResponse.json(output);
  } catch (error) {
    console.error("[assessment:progress]", error);
    return NextResponse.json({ error: "Assessment progress could not be saved" }, { status: 503 });
  }
}
