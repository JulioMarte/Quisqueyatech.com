import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  readAdminJson,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { assessmentAdminCorrectionSchema } from "@/lib/validations/assessment";

type Context = { params: Promise<{ assessmentId: string }> };

export async function GET(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { assessmentId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(assessmentId))
      return adminFailure(trace, "Invalid assessment id", 400);
    const data = await fetchAuthQuery(api.assessments.adminGetState, { assessmentId });
    return data ? adminJson(trace, data) : adminFailure(trace, "Not found", 404);
  } catch (error) {
    return adminException(trace, "assessments.detail", error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { assessmentId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(assessmentId))
      return adminFailure(trace, "Invalid assessment id", 400);
    const parsed = assessmentAdminCorrectionSchema.safeParse(await readAdminJson(request, 128_000));
    if (!parsed.success)
      return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid request", 400);
    const result = await fetchAuthMutation(api.assessments.adminCorrectSnapshot, {
      assessmentId,
      ...parsed.data,
    });
    return adminJson(trace, result);
  } catch (error) {
    return adminException(trace, "assessments.correct", error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { assessmentId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(assessmentId))
      return adminFailure(trace, "Invalid assessment id", 400);
    const result = await fetchAuthMutation(api.assessments.adminDelete, { assessmentId });
    return result
      ? adminJson(trace, result)
      : adminFailure(trace, "No se encontró la evaluación.", 404);
  } catch (error) {
    return adminException(trace, "assessments.delete", error);
  }
}
