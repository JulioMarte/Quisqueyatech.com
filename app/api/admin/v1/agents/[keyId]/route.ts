import { randomBytes } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { adminException, adminFailure, adminJson, authorizeContentRequest, requestId } from "@/lib/server/admin-content";
import { tokenHash } from "@/lib/server/auth";
import { fetchAuthMutation } from "@/lib/server/auth-server";
type Context = { params: Promise<{ keyId: string }> };
export async function DELETE(request: Request, context: Context) { const trace = requestId(request); try { if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401); const { keyId } = await context.params; const found = await fetchAuthMutation(api.auth.revokeAgent, { keyId, now: Date.now() }); return found ? adminJson(trace, { revoked: true }) : adminFailure(trace, "Not found", 404); } catch (error) { return adminException(trace, "agents.revoke", error); } }
export async function POST(request: Request, context: Context) { const trace = requestId(request); try { if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401); const { keyId } = await context.params, raw = `qta_${keyId}_${randomBytes(32).toString("base64url")}`; const found = await fetchAuthMutation(api.auth.rotateAgent, { keyId, tokenHash: tokenHash(raw), prefix: `${raw.slice(0, 18)}…`, now: Date.now() }); return found ? adminJson(trace, { keyId, token: raw }) : adminFailure(trace, "Not found", 404); } catch (error) { return adminException(trace, "agents.rotate", error); } }
