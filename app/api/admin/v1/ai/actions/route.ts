import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { adminException, adminFailure, adminJson, authorizeContentRequest, readAdminJson, requestId } from "@/lib/server/admin-content";
import { contentAiProvider } from "@/lib/server/content-ai";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { checkSecurityRateLimit, requestFingerprint } from "@/lib/server/auth";
import { aiActionSchema } from "@/lib/validations/content";

export async function POST(request: Request) {
  const trace = requestId(request);
  let actor;
  let previous: unknown = null;
  const idempotencyKey = request.headers.get("idempotency-key")?.slice(0, 160);
  try {
    actor = await authorizeContentRequest(request);
    if (!actor) return adminFailure(trace, "Unauthorized", 401);
    if (idempotencyKey) previous = await fetchAuthQuery(api.posts.adminIdempotencyGet, { scope: "content-ai", key: idempotencyKey });
  } catch (error) { return adminException(trace, "content-ai.authorize", error); }
  if (previous) return adminJson(trace, previous);
  try { const rate = await checkSecurityRateLimit(requestFingerprint(request, "content-ai"), 30, 60 * 60 * 1000); if (!rate.allowed) return adminFailure(trace, "AI request limit reached", 429); }
  catch (error) { return adminException(trace, "content-ai.rate-limit", error); }
  let payload: unknown;
  try { payload = await readAdminJson(request, 140_000); } catch (error) { return adminException(trace, "content-ai.payload", error); }
  const parsed = aiActionSchema.safeParse(payload);
  if (!parsed.success) return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid request", 400);
  const started = Date.now();
  try {
    const generated = await contentAiProvider().generate(parsed.data);
    const runId = await fetchAuthMutation(api.posts.adminRecordAiRun, { postId: parsed.data.postId as Id<"posts"> | undefined, action: parsed.data.action, provider: "gemini", model: generated.model, status: "completed", warnings: generated.proposal.warnings, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, durationMs: Date.now() - started });
    const data = { proposal: generated.proposal, warnings: generated.proposal.warnings, runId, usage: { inputTokens: generated.inputTokens, outputTokens: generated.outputTokens } };
    if (idempotencyKey) await fetchAuthMutation(api.posts.adminIdempotencyPut, { scope: "content-ai", key: idempotencyKey, value: data });
    return adminJson(trace, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    try { await fetchAuthMutation(api.posts.adminRecordAiRun, { postId: parsed.data.postId as Id<"posts"> | undefined, action: parsed.data.action, provider: "gemini", model: process.env.CONTENT_AI_MODEL || "gemini-2.5-flash", status: "failed", warnings: ["AI provider failed"], durationMs: Date.now() - started }); } catch { /* storage may be unavailable too */ }
    if (/not configured|unsupported content AI provider/i.test(message)) return adminException(trace, "content-ai.generate", error);
    console.error(JSON.stringify({ scope: "admin-api", requestId: trace, operation: "content-ai.generate", result: "upstream_error" }));
    return adminFailure(trace, "El proveedor de IA no pudo completar la solicitud.", 502);
  }
}
