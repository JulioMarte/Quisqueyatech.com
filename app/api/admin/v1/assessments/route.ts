import { createHash, randomUUID } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { adminException, adminFailure, adminJson, authorizeContentRequest, readAdminJson, requestId } from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { assessmentReviewSchema } from "@/lib/validations/assessment";
import { sendApprovedAssessmentReport } from "@/lib/server/assessment-email";

export async function GET(request: Request) {
  const id = requestId(request);
  try { if (!(await authorizeContentRequest(request))) return adminFailure(id, "Unauthorized", 401); const url = new URL(request.url); const cursor = url.searchParams.get("cursor"); const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 25))); const reportStatus = url.searchParams.get("status")?.slice(0, 40) || undefined; const page = await fetchAuthQuery(api.assessments.adminList, { paginationOpts: { cursor, numItems: limit }, reportStatus }); return adminJson(id, { items: page.page, continueCursor: page.continueCursor, isDone: page.isDone }); }
  catch (error) { return adminException(id, "assessments.list", error); }
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(id, "Unauthorized", 401);
    const parsed = assessmentReviewSchema.safeParse(await readAdminJson(request, 64_000));
    if (!parsed.success) return adminFailure(id, parsed.error.issues[0]?.message || "Invalid request", 400);
    if (parsed.data.action === "save") {
      const saved = await fetchAuthMutation(api.assessments.adminReview, { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, expectedRevision: parsed.data.expectedRevision });
      return adminJson(id, { sent: false, revision: saved.revision });
    }
    const stored = await fetchAuthQuery(api.assessments.adminGetState, { assessmentId: parsed.data.assessmentId });
    if (!stored) return adminFailure(id, "No se encontró la evaluación.", 404);
    if (!stored.lead?.email || stored.lead.email.endsWith("@anonymous.invalid") || stored.snapshot?.fields?.email?.status !== "confirmed" || stored.snapshot.fields.email.value !== stored.lead.email) return adminFailure(id, "Confirma el email antes de aprobar y enviar.", 409);
    const contentHash = createHash("sha256").update(JSON.stringify(parsed.data.report)).digest("hex");
    const claim = await fetchAuthMutation(api.assessments.claimReportSend, { assessmentId: parsed.data.assessmentId, reportDraft: parsed.data.report, expectedRevision: parsed.data.expectedRevision, contentHash, claimId: randomUUID() });
    try {
      const delivery = await sendApprovedAssessmentReport(stored.lead.email, stored.lead.locale || "es", parsed.data.report, claim.idempotencyKey);
      const finalized = await fetchAuthMutation(api.assessments.finalizeReportSend, { assessmentId: parsed.data.assessmentId, claimId: claim.claimId, messageId: delivery.messageId });
      return adminJson(id, { sent: true, revision: finalized.revision, sentAt: finalized.sentAt });
    } catch {
      await fetchAuthMutation(api.assessments.failReportSend, { assessmentId: parsed.data.assessmentId, claimId: claim.claimId, publicError: "El proveedor de correo no confirmó el envío." });
      console.error(JSON.stringify({ scope: "admin-api", requestId: id, operation: "assessments.send", result: "upstream_error" }));
      return adminFailure(id, "El proveedor de correo no confirmó el envío.", 502);
    }
  } catch (error) { return adminException(id, "assessments.review", error); }
}
