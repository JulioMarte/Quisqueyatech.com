import { api } from "@/convex/_generated/api";
import { adminException, adminFailure, adminJson, authorizeContentRequest, requestId } from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { assessmentReviewSchema } from "@/lib/validations/assessment";
import { sendApprovedAssessmentReport } from "@/lib/server/assessment-email";

export async function GET(request: Request) {
  const id = requestId(request);
  try { if (!(await authorizeContentRequest(request))) return adminFailure(id, "Unauthorized", 401); return adminJson(id, await fetchAuthQuery(api.assessments.adminList, {})); }
  catch (error) { return adminException(id, "assessments.list", error); }
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  try {
    const actor = await authorizeContentRequest(request);
    if (!actor) return adminFailure(id, "Unauthorized", 401);
    const parsed = assessmentReviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return adminFailure(id, parsed.error.issues[0]?.message || "Invalid request", 400);
    const stored = await fetchAuthQuery(api.assessments.adminGetState, { assessmentId: parsed.data.assessmentId });
    if (!stored?.lead?.email || stored.lead.email.endsWith("@anonymous.invalid") || stored.snapshot?.fields?.email?.status !== "confirmed" || stored.snapshot.fields.email.value !== stored.lead.email) throw new Error("The assessment does not have a verified email");
    if (parsed.data.action === "save") {
      await fetchAuthMutation(api.assessments.adminReview, { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, reportStatus: "review_pending", reviewedBy: actor.email, reviewedAt: Date.now() });
      return adminJson(id, { sent: false });
    }
    const claim = await fetchAuthMutation(api.assessments.claimReportSend, { assessmentId: parsed.data.assessmentId, reviewedBy: actor.email, now: Date.now() });
    if (!claim) return adminFailure(id, "This report is already sending or sent", 409);
    const sentAt = Date.now();
    try {
      await sendApprovedAssessmentReport(stored.lead.email, stored.lead.locale || "es", parsed.data.report, `assessment-${parsed.data.assessmentId}-r${claim.revision}`);
      await fetchAuthMutation(api.assessments.adminReview, { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, reportStatus: "sent", reviewedBy: actor.email, reviewedAt: sentAt, sentAt });
    } catch (error) {
      await fetchAuthMutation(api.assessments.adminReview, { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, reportStatus: "send_failed", reviewedBy: actor.email, reviewedAt: Date.now(), sendError: error instanceof Error ? error.message : "Email failed" });
      throw error;
    }
    return adminJson(id, { sent: Boolean(sentAt) });
  } catch (error) { return adminException(id, "assessments.review", error); }
}
