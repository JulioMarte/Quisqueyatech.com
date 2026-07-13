import { NextResponse } from "next/server";
import { authorizeContentRequest, adminSecret, requestId } from "@/lib/server/admin-content";
import { contentAiProvider } from "@/lib/server/content-ai";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { allowRequest } from "@/lib/server/rate-limit";
import { aiActionSchema } from "@/lib/validations/content";

export async function POST(request: Request) {
  const trace = requestId(request);
  const actor = await authorizeContentRequest(request);
  if (!actor) return NextResponse.json({ data: null, error: "Unauthorized", requestId: trace }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key")?.slice(0, 160);
  if (idempotencyKey) { const previous = await convexQuery("posts:serverIdempotencyGet", { secret: adminSecret(), scope: "content-ai", key: idempotencyKey }); if (previous) return NextResponse.json({ data: previous, error: null, requestId: trace }); }
  if (!allowRequest(`content-ai:${actor.email}`, 30, 60 * 60 * 1000)) return NextResponse.json({ data: null, error: "AI request limit reached", requestId: trace }, { status: 429 });
  const parsed = aiActionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message, requestId: trace }, { status: 400 });
  const started = Date.now();
  try {
    const generated = await contentAiProvider().generate(parsed.data);
    const runId = await convexMutation("posts:serverRecordAiRun", { secret: adminSecret(), postId: parsed.data.postId, action: parsed.data.action, provider: "gemini", model: generated.model, status: "completed", warnings: generated.proposal.warnings, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, durationMs: Date.now() - started });
    const data = { proposal: generated.proposal, warnings: generated.proposal.warnings, runId, usage: { inputTokens: generated.inputTokens, outputTokens: generated.outputTokens } };
    if (idempotencyKey) await convexMutation("posts:serverIdempotencyPut", { secret: adminSecret(), scope: "content-ai", key: idempotencyKey, value: data });
    return NextResponse.json({ data, error: null, requestId: trace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    try { await convexMutation("posts:serverRecordAiRun", { secret: adminSecret(), postId: parsed.data.postId, action: parsed.data.action, provider: "gemini", model: process.env.CONTENT_AI_MODEL || "gemini-2.5-flash", status: "failed", warnings: [message], durationMs: Date.now() - started }); } catch { /* storage may be unavailable too */ }
    return NextResponse.json({ data: null, error: message, requestId: trace }, { status: 502 });
  }
}
