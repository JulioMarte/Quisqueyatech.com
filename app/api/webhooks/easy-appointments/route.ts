import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { convexMutation } from "@/lib/server/convex";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
  const serviceSecret = process.env.ADMIN_API_SECRET;
  if (!serviceSecret) return NextResponse.json({ error: "Webhook service is not configured" }, { status: 503 });
  const expected = process.env.EASY_APPOINTMENTS_WEBHOOK_TOKEN;
  const received = request.headers.get("x-ea-token");
  if (!expected || !received || !safeEqual(expected, received)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json();
  const eventId = request.headers.get("x-ea-event-id") || hashPayload(payload);
  const event = request.headers.get("x-ea-action") || "Save";
  const result = await convexMutation("bookings:fromWebhook", { secret: serviceSecret, eventId, event, payload: JSON.stringify(payload), requestId, receivedAt: Date.now() });
  console.info("[easy-appointments:webhook]", { requestId, eventId, event, result });
  return NextResponse.json({ ok: true, requestId });
}
function safeEqual(a: string, b: string) { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
function hashPayload(payload: unknown) { return createHash("sha256").update(JSON.stringify(payload)).digest("base64url"); }
