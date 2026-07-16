import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAssessmentSnapshot } from "@/lib/assessment/engine";
import type { AssessmentSnapshot } from "@/lib/assessment/types";
import { redactSensitiveText } from "@/lib/assessment/data-policy";
import { buildAssessmentReport } from "@/lib/server/assessment-report";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { runtimeConfig, type RuntimeConfig } from "@/lib/server/runtime-config";

type Payload = { event: string; call: { callId: string; created?: string; ended?: string; endReason?: string; metadata?: { assessmentId?: string; locale?: "es" | "en" } } };

export async function POST(request: Request) {
  const raw = await request.text();
  const runtime = await runtimeConfig();
  if (!verifyWebhook(request, raw, String(runtime.ultravoxWebhookSecret || ""))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let payload: Payload;
  try { payload = JSON.parse(raw) as Payload; } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  const eventId = `${payload.event}:${payload.call.callId}:${payload.call.ended || payload.call.created || "unknown"}`;
  const fresh = await convexMutation("assessments:recordWebhook", { eventId, provider: "ultravox", event: payload.event, payload: redactSensitiveText(raw.slice(0, 100_000)).text, receivedAt: Date.now() });
  if (!fresh) return new NextResponse(null, { status: 204 });
  if (payload.event !== "call.ended") { await convexMutation("assessments:finishWebhook", { eventId, success: true, now: Date.now() }); return new NextResponse(null, { status: 204 }); }
  try {
    const stored = await convexQuery("assessments:getByProviderSession", { providerSessionId: payload.call.callId }) as { assessmentId: string; snapshot?: AssessmentSnapshot; lead?: { locale?: "es" | "en" }; session: { sessionKey: string }; createdAt: number } | null;
    if (!stored) throw new Error("Assessment session not found");
    const transcript = redactSensitiveText(await getUltravoxTranscript(payload.call.callId, runtime)).text;
    const locale = stored.lead?.locale || payload.call.metadata?.locale || "es";
    const snapshot = stored.snapshot || createAssessmentSnapshot(locale);
    const durationSeconds = Math.min(900, payload.call.ended && payload.call.created ? Math.round((new Date(payload.call.ended).getTime() - new Date(payload.call.created).getTime()) / 1000) : snapshot.elapsedSeconds);
    const progress = await convexMutation("assessments:advance", { assessmentId: stored.assessmentId, sessionKey: stored.session.sessionKey, input: { assessmentId: stored.assessmentId, eventId: crypto.randomUUID(), reason: snapshot.complete ? "close" : "interruption", elapsedSeconds: durationSeconds }, alerts: [], now: Date.now() }) as { snapshot: AssessmentSnapshot };
    await convexMutation("assessments:storeSessionReport", { sessionKey: stored.session.sessionKey, transcript, report: { providerEvent: payload.event }, endedAt: Date.now(), durationSeconds, completionReason: payload.call.endReason || "ultravox-call-ended" });
    const claimed = await convexMutation("assessments:claimFinalization", { assessmentId: stored.assessmentId, now: Date.now() });
    if (claimed) {
      const report = await buildAssessmentReport(progress.snapshot, transcript, locale);
      await convexMutation("assessments:complete", { assessmentId: stored.assessmentId, sessionKey: stored.session.sessionKey, transcript, provider: "ultravox", durationSeconds, result: report, completionReason: payload.call.endReason || "ultravox-call-ended", completedAt: Date.now() });
    }
    await convexMutation("assessments:finishWebhook", { eventId, success: true, now: Date.now() });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await convexMutation("assessments:finishWebhook", { eventId, success: false, error: error instanceof Error ? error.message : "unknown", now: Date.now() });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 503 });
  }
}

function verifyWebhook(request: Request, raw: string, secret: string) {
  if (!secret) return process.env.NODE_ENV !== "production";
  const timestamp = request.headers.get("x-ultravox-webhook-timestamp") || "";
  const signatures = (request.headers.get("x-ultravox-webhook-signature") || "").split(",").map((item) => item.trim());
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time) || Math.abs(Date.now() - time) > 60_000) return false;
  const expected = createHmac("sha256", secret).update(raw + timestamp).digest("hex");
  return signatures.some((signature) => { const left = Buffer.from(signature); const right = Buffer.from(expected); return left.length === right.length && timingSafeEqual(left, right); });
}

async function getUltravoxTranscript(callId: string, runtime: RuntimeConfig) {
  if (!runtime.ultravoxApiKey) return "";
  const base = String(runtime.ultravoxApiUrl || "https://api.ultravox.ai/api/calls").replace(/\/$/, "");
  const response = await fetch(`${base}/${encodeURIComponent(callId)}/messages`, { headers: { "X-API-Key": String(runtime.ultravoxApiKey) }, cache: "no-store" });
  if (!response.ok) throw new Error(`Ultravox transcript failed (${response.status})`);
  const payload = await response.json() as { results?: { role?: string; text?: string }[] } | { role?: string; text?: string }[];
  const messages = Array.isArray(payload) ? payload : payload.results || [];
  return messages.map((item) => `${item.role || "unknown"}: ${item.text || ""}`).join("\n");
}
