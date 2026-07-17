import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";

export async function GET(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    return adminJson(trace, { defaultProvider: "livekit" });
  } catch (error) {
    return adminException(trace, "voice-settings.get", error);
  }
}
export async function PATCH(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const stored = await fetchAuthQuery(api.settings.adminGet, {});
    await fetchAuthMutation(api.settings.adminSave, {
      config: { ...(stored.config as Record<string, unknown>), defaultProvider: "livekit" },
      secrets: [],
    });
    return adminJson(trace, { defaultProvider: "livekit" });
  } catch (error) {
    return adminException(trace, "voice-settings.update", error);
  }
}
export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    return adminJson(trace, { url: `${base}/evaluacion/ahora` });
  } catch (error) {
    return adminException(trace, "voice-settings.test-link", error);
  }
}
