import { NextResponse } from "next/server";
import { assessmentPrompt } from "@/lib/server/voice";
import { verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import { convexQuery } from "@/lib/server/convex";
import { bearerToken, isTrustedAssessmentWorker } from "@/lib/server/worker-auth";
import { runtimeConfig } from "@/lib/server/runtime-config";

export async function GET(request: Request) {
  await runtimeConfig();
  const url = new URL(request.url);
  const assessmentId = url.searchParams.get("assessmentId") || "";
  const token = bearerToken(request);
  const verified = verifyAssessmentToken(token, "progress");
  const trustedWorker = await isTrustedAssessmentWorker(request);
  if ((!verified?.assessmentId || verified.assessmentId !== assessmentId) && !trustedWorker)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stored = (await convexQuery("assessments:getState", { assessmentId })) as {
    snapshot?: unknown;
    lead?: { locale?: "es" | "en"; firstName?: string };
  } | null;
  const locale = stored?.lead?.locale || "es";
  const resumeSummary = stored?.snapshot ? JSON.stringify(stored.snapshot) : undefined;
  return NextResponse.json({
    prompt: assessmentPrompt(
      locale,
      stored?.lead?.firstName || (locale === "es" ? "visitante" : "guest"),
      resumeSummary,
    ),
  });
}
