import { randomBytes } from "node:crypto";
import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { tokenHash } from "@/lib/server/auth";
import { fetchAuthMutation } from "@/lib/server/auth-server";
import { z } from "zod";
type Context = { params: Promise<{ keyId: string }> };
const patchInput = z.union([
  z.object({ action: z.literal("activate"), activationId: z.string().min(16).max(100) }),
  z.object({
    action: z.literal("limits"),
    requestLimit: z.number().int().min(10).max(1000),
    uploadLimit: z.number().int().min(1).max(100),
  }),
]);
function validKeyId(keyId: string) {
  return /^[A-Za-z0-9_-]{8,32}$/.test(keyId);
}
export async function DELETE(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { keyId } = await context.params;
    if (!validKeyId(keyId)) return adminFailure(trace, "Invalid key id", 400);
    const found = await fetchAuthMutation(api.auth.revokeAgent, { keyId });
    return found ? adminJson(trace, { revoked: true }) : adminFailure(trace, "Not found", 404);
  } catch (error) {
    return adminException(trace, "agents.revoke", error);
  }
}
export async function POST(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { keyId } = await context.params;
    if (!validKeyId(keyId)) return adminFailure(trace, "Invalid key id", 400);
    const raw = `qta_${keyId}_${randomBytes(32).toString("base64url")}`,
      activationId = randomBytes(18).toString("base64url");
    const found = await fetchAuthMutation(api.auth.prepareAgentRotation, {
      keyId,
      tokenHash: tokenHash(raw),
      prefix: `${raw.slice(0, 18)}…`,
      activationId,
    });
    return found
      ? adminJson(trace, {
          keyId,
          token: raw,
          activationId,
          status: "pending",
          expiresInSeconds: 1800,
        })
      : adminFailure(trace, "Not found", 404);
  } catch (error) {
    return adminException(trace, "agents.rotate", error);
  }
}
export async function PATCH(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { keyId } = await context.params;
    if (!validKeyId(keyId)) return adminFailure(trace, "Invalid key id", 400);
    const parsed = patchInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid request", 400);
    const found =
      parsed.data.action === "activate"
        ? await fetchAuthMutation(api.auth.activateAgentCredential, {
            keyId,
            activationId: parsed.data.activationId,
          })
        : await fetchAuthMutation(api.auth.updateAgentLimits, {
            keyId,
            requestLimit: parsed.data.requestLimit,
            uploadLimit: parsed.data.uploadLimit,
          });
    return found
      ? adminJson(trace, { keyId, activated: parsed.data.action === "activate", updated: true })
      : adminFailure(trace, "Not found", 404);
  } catch (error) {
    return adminException(trace, "agents.update", error);
  }
}
