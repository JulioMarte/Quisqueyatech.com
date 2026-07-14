import { NextResponse } from "next/server";
import { convexMutation } from "@/lib/server/convex";

export async function POST(request: Request) {
  const form = Object.fromEntries(await request.formData());
  await convexMutation("bookings:updateCall", { callSid: String(form.CallSid || ""), status: String(form.CallStatus || "unknown"), payload: JSON.stringify(form), receivedAt: Date.now() });
  return NextResponse.json({ ok: true });
}
