import { NextResponse } from "next/server";
import { authorizeContentRequest, requestId } from "@/lib/server/admin-content";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { assessmentReviewSchema } from "@/lib/validations/assessment";
import { sendApprovedAssessmentReport } from "@/lib/server/assessment-email";

export async function GET(request: Request) {
  const id = requestId(request);
  if (!(await authorizeContentRequest(request))) return NextResponse.json({ data: null, error: "Unauthorized", requestId: id }, { status: 401 });
  try { return NextResponse.json({ data: await convexQuery("assessments:adminList", {}) || [], error: null, requestId: id }); }
  catch (error) { return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not load assessments", requestId: id }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  const actor = await authorizeContentRequest(request);
  if (!actor) return NextResponse.json({ data: null, error: "Unauthorized", requestId: id }, { status: 401 });
  const parsed = assessmentReviewSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message, requestId: id }, { status: 400 });
  try {
    const stored = await convexQuery("assessments:getState", { assessmentId: parsed.data.assessmentId }) as { snapshot?: { fields?: { email?: { status?: string; value?: string } } }; lead?: { email?: string; locale?: "es" | "en" } } | null;
    if (!stored?.lead?.email || stored.lead.email.endsWith("@anonymous.invalid") || stored.snapshot?.fields?.email?.status !== "confirmed" || stored.snapshot.fields.email.value !== stored.lead.email) throw new Error("The assessment does not have a verified email");
    if (parsed.data.action === "save") {
      await convexMutation("assessments:adminReview", { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, reportStatus: "review_pending", reviewedBy: actor.email, reviewedAt: Date.now() });
      return NextResponse.json({ data: { sent: false }, error: null, requestId: id });
    }
    const claim = await convexMutation("assessments:claimReportSend", { assessmentId: parsed.data.assessmentId, reviewedBy: actor.email, now: Date.now() }) as { revision: number } | null;
    if (!claim) return NextResponse.json({ data: null, error: "This report is already sending or sent", requestId: id }, { status: 409 });
    const sentAt = Date.now();
    try {
      await sendApprovedAssessmentReport(stored.lead.email, stored.lead.locale || "es", parsed.data.report, `assessment-${parsed.data.assessmentId}-r${claim.revision}`);
      await convexMutation("assessments:adminReview", { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, reportStatus: "sent", reviewedBy: actor.email, reviewedAt: sentAt, sentAt });
    } catch (error) {
      await convexMutation("assessments:adminReview", { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, reportStatus: "send_failed", reviewedBy: actor.email, reviewedAt: Date.now(), sendError: error instanceof Error ? error.message : "Email failed" });
      throw error;
    }
    return NextResponse.json({ data: { sent: Boolean(sentAt) }, error: null, requestId: id });
  } catch (error) { return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not review report", requestId: id }, { status: 503 }); }
}
