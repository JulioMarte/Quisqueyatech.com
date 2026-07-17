import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { agendaExceptionSchema, agendaRulesSchema } from "@/lib/validations/assessment";

export async function GET(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) {
      return adminFailure(trace, "Unauthorized", 401);
    }
    return adminJson(trace, await fetchAuthQuery(api.agenda.adminRules, {}));
  } catch (error) {
    return adminException(trace, "agenda.rules.get", error);
  }
}

export async function PUT(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) {
      return adminFailure(trace, "Unauthorized", 401);
    }
    const parsed = agendaRulesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return adminFailure(
        trace,
        parsed.error.issues[0]?.message || "Invalid availability configuration",
        400,
      );
    }
    return adminJson(trace, await fetchAuthMutation(api.agenda.adminSaveRules, parsed.data));
  } catch (error) {
    return adminException(trace, "agenda.rules.update", error);
  }
}

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) {
      return adminFailure(trace, "Unauthorized", 401);
    }
    const parsed = agendaExceptionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid exception", 400);
    }
    return adminJson(trace, await fetchAuthMutation(api.agenda.adminSaveException, parsed.data));
  } catch (error) {
    return adminException(trace, "agenda.exception", error);
  }
}
