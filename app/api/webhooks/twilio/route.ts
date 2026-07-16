import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { convexMutation } from "@/lib/server/convex";

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSecret = process.env.ADMIN_API_SECRET;
  if (!authToken || !serviceSecret) return NextResponse.json({ error: "Webhook service is not configured" }, { status: 503 });
  const form = Object.fromEntries(await request.formData()) as Record<string, string>;
  const signature = request.headers.get("x-twilio-signature") || "";
  const publicBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const requestUrl = new URL(request.url);
  const signedUrl = publicBase ? `${publicBase}${requestUrl.pathname}${requestUrl.search}` : request.url;
  const signedPayload = signedUrl + Object.keys(form).sort().map((key) => `${key}${form[key]}`).join("");
  const expected = createHmac("sha1", authToken).update(signedPayload).digest("base64");
  if (!safeEqual(expected, signature)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await convexMutation("bookings:updateCall", { secret: serviceSecret, callSid: String(form.CallSid || ""), status: String(form.CallStatus || "unknown"), payload: JSON.stringify(form), receivedAt: Date.now() });
  return NextResponse.json({ ok: true });
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
