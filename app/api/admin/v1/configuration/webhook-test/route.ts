import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthAction } from "@/lib/server/auth-server";

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const result = await fetchAuthAction(api.webhookDelivery.adminTest, {});
    if (!result.success)
      return adminFailure(
        trace,
        `El webhook de prueba falló (${result.error || "UPSTREAM_ERROR"}).`,
        502,
        "UPSTREAM_ERROR",
      );
    return adminJson(trace, result);
  } catch (error) {
    return adminException(trace, "configuration.webhook-test", error);
  }
}
