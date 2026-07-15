import { api } from "@/convex/_generated/api";
import { adminException, adminFailure, adminJson, authorizeContentRequest, requestId } from "@/lib/server/admin-content";
import { fetchAuthQuery } from "@/lib/server/auth-server";

type Context = { params: Promise<{ assessmentId: string }> };

export async function GET(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { assessmentId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(assessmentId)) return adminFailure(trace, "Invalid assessment id", 400);
    const data = await fetchAuthQuery(api.assessments.adminGetState, { assessmentId });
    return data ? adminJson(trace, data) : adminFailure(trace, "Not found", 404);
  } catch (error) { return adminException(trace, "assessments.detail", error); }
}
