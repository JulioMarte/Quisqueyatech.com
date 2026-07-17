import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { renderAssessmentReportHtml } from "@/lib/server/assessment-email";
import { assessmentReportSchema } from "@/lib/validations/assessment";
import { z } from "zod";

const input = z.object({ locale: z.enum(["es", "en"]), report: assessmentReportSchema });

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid request", 400);
    return adminJson(trace, {
      html: renderAssessmentReportHtml(parsed.data.locale, parsed.data.report),
    });
  } catch (error) {
    return adminException(trace, "assessments.preview", error);
  }
}
