import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  readAdminJson,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation } from "@/lib/server/auth-server";
import { assessmentBulkDeleteSchema } from "@/lib/validations/assessment";

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const parsed = assessmentBulkDeleteSchema.safeParse(await readAdminJson(request, 16_000));
    if (!parsed.success)
      return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid request", 400);
    const result = await fetchAuthMutation(api.assessments.adminBulkDelete, parsed.data);
    return adminJson(trace, {
      deleted: result.deleted,
      failed: result.missing.map((assessmentId) => ({
        assessmentId,
        reason: "La evaluación ya no existe.",
      })),
    });
  } catch (error) {
    return adminException(trace, "assessments.bulk-delete", error);
  }
}
