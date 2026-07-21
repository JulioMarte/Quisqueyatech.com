import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validations/assessment";
import { convexMutation } from "@/lib/server/convex";
import { allowRequest } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { requestIp } from "@/lib/server/request-ip";

export async function POST(request: Request) {
  try {
    const ip = requestIp(request);
    if (!(await allowRequest(`booking:${ip || "ip-unavailable"}`, 8)))
      return NextResponse.json({ error: "Too many booking attempts" }, { status: 429 });
    const parsed = bookingSchema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: issue?.message || "Invalid booking",
          field: issue?.path[0] ? String(issue.path[0]) : undefined,
          code: "validation",
        },
        { status: 400 },
      );
    }
    const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip, "scheduling_book");
    if (!turnstile.ok)
      return NextResponse.json(
        {
          error: "Human verification failed",
          code: turnstile.code,
          supportId: turnstile.supportId,
        },
        { status: turnstile.code === "TURNSTILE_UNAVAILABLE" ? 503 : 403 },
      );
    const serviceSecret = process.env.ADMIN_API_SECRET?.trim();
    if (!serviceSecret) {
      console.error("[scheduling:book] ADMIN_API_SECRET is not configured");
      return NextResponse.json({ error: "Booking is temporarily unavailable." }, { status: 503 });
    }
    const requestedIdempotencyKey = request.headers.get("idempotency-key")?.trim();
    const safeIdempotencyKey =
      requestedIdempotencyKey && /^[A-Za-z0-9._:-]{1,120}$/.test(requestedIdempotencyKey)
        ? requestedIdempotencyKey
        : undefined;
    const bookingId = parsed.data.bookingAttemptId || safeIdempotencyKey || crypto.randomUUID();
    const {
      website: _website,
      turnstileToken: _turnstileToken,
      bookingAttemptId: _bookingAttemptId,
      ...booking
    } = parsed.data;
    void _website;
    void _turnstileToken;
    void _bookingAttemptId;
    const result = (await convexMutation("agenda:create", {
      serviceSecret,
      bookingId,
      firstName: booking.firstName,
      lastName: booking.lastName,
      company: booking.company,
      role: booking.role,
      country: booking.country,
      locale: booking.locale,
      email: booking.email,
      phone: booking.phone,
      notes: booking.notes,
      recordingConsent: booking.recordingConsent,
      start: booking.start,
      timezone: booking.timezone,
      channel: booking.channel,
    })) as { confirmed: boolean; status: string };
    try {
      await convexMutation("funnel:track", {
        serviceSecret,
        sessionId: bookingId,
        locale: parsed.data.locale,
        name: "assessment_booked",
        bookingId,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error("[scheduling:book:funnel]", error);
    }
    return NextResponse.json({
      ok: true,
      bookingId,
      configured: true,
      confirmed: result.confirmed,
      status: result.status,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("SLOT_UNAVAILABLE"))
      return NextResponse.json(
        { error: "That time is no longer available", code: "slot_unavailable" },
        { status: 409 },
      );
    console.error("[scheduling:book]", error);
    return NextResponse.json({ error: "We could not save the appointment." }, { status: 502 });
  }
}
