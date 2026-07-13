import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validations/assessment";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { allowRequest } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import {
  EasyAppointmentsProvider,
  SchedulingError,
  easyAppointmentsConfigured,
} from "@/lib/server/scheduling";

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!allowRequest(`booking:${ip}`, 8))
      return NextResponse.json(
        { error: "Too many booking attempts" },
        { status: 429 },
      );
    const parsed = bookingSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid booking" },
        { status: 400 },
      );
    if (!(await verifyTurnstile(parsed.data.turnstileToken, ip)))
      return NextResponse.json(
        { error: "Human verification failed" },
        { status: 403 },
      );
    const bookingId = parsed.data.bookingAttemptId || request.headers.get("idempotency-key")?.slice(0, 120) || crypto.randomUUID();
    if (process.env.ADMIN_API_SECRET) {
      const existing = await convexQuery("bookings:byBookingId", { secret: process.env.ADMIN_API_SECRET, bookingId }) as { externalId?: string; status: string } | null;
      if (existing) return NextResponse.json({ ok: true, bookingId, configured: easyAppointmentsConfigured(), confirmed: existing.status === "confirmed", status: existing.status });
    }
    let externalId: string | undefined;
    let status = "pending_confirmation";
    if (easyAppointmentsConfigured()) {
      try {
        const external = await new EasyAppointmentsProvider().book(parsed.data);
        externalId = external.externalId;
        status = external.status;
      } catch (reason) {
        if (reason instanceof SchedulingError && !reason.retryable) return NextResponse.json({ error: reason.message, code: "slot_unavailable" }, { status: reason.status === 422 ? 409 : reason.status });
        console.error("[scheduling:book:pending]", { bookingId, reason: reason instanceof Error ? reason.message : "unknown" });
      }
    }
    const {
      website: _website,
      turnstileToken: _turnstileToken,
      bookingAttemptId: _bookingAttemptId,
      ...booking
    } = parsed.data;
    void _website;
    void _turnstileToken;
    void _bookingAttemptId;
    await convexMutation("bookings:upsert", {
      bookingId,
      externalId,
      ...booking,
      status,
      createdAt: Date.now(),
    });
    await convexMutation("funnel:track", {
      sessionId: bookingId,
      locale: parsed.data.locale,
      name: "assessment_booked",
      bookingId,
      createdAt: Date.now(),
    });
    return NextResponse.json({
      ok: true,
      bookingId,
      configured: easyAppointmentsConfigured(),
      confirmed: status === "confirmed",
      status,
    }, { status: status === "confirmed" ? 200 : 202 });
  } catch (error) {
    console.error("[scheduling:book]", error);
    return NextResponse.json(
      { error: "We could not save the appointment." },
      { status: 502 },
    );
  }
}
