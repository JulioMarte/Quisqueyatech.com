import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function constantTimeEqual(left: string, right: string) {
  const size = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function requireServer(secret: string) {
  const expected = process.env.ADMIN_API_SECRET?.trim();
  if (!expected || !constantTimeEqual(secret, expected)) {
    throw new Error("UNAUTHORIZED");
  }
}

function assertTimeZone(timezone: string) {
  try {
    if (!timezone || timezone.length > 80 || timezone !== timezone.trim()) {
      throw new Error();
    }
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
  } catch {
    throw new Error("INVALID_TIMEZONE");
  }
}

export const byBookingId = query({
  args: { secret: v.string(), bookingId: v.string() },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    return ctx.db
      .query("bookings")
      .withIndex("by_booking_id", (queryBuilder) =>
        queryBuilder.eq("bookingId", args.bookingId),
      )
      .unique();
  },
});

export const upsert = mutation({
  args: {
    secret: v.string(),
    bookingId: v.string(),
    externalId: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    company: v.string(),
    role: v.string(),
    country: v.string(),
    locale: v.union(v.literal("es"), v.literal("en")),
    email: v.string(),
    phone: v.string(),
    processingConsent: v.boolean(),
    recordingConsent: v.boolean(),
    start: v.string(),
    timezone: v.string(),
    channel: v.union(v.literal("web"), v.literal("phone")),
    status: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    assertTimeZone(args.timezone);
    const now = Date.now();
    const startAt = Date.parse(args.start);
    if (!Number.isFinite(startAt)) throw new Error("INVALID_BOOKING_START");
    const current = await ctx.db
      .query("bookings")
      .withIndex("by_booking_id", (queryBuilder) =>
        queryBuilder.eq("bookingId", args.bookingId),
      )
      .unique();
    if (current) {
      await ctx.db.patch(current._id, {
        externalId: args.externalId,
        status: args.status,
        updatedAt: now,
      });
      return current._id;
    }
    const leadId = await ctx.db.insert("leads", {
      bookingId: args.bookingId,
      firstName: args.firstName,
      lastName: args.lastName,
      company: args.company,
      role: args.role,
      country: args.country,
      locale: args.locale,
      email: args.email,
      phone: args.phone,
      source: "scheduled-assessment",
      status: args.status,
      processingConsentAt: now,
      leadExpiresAt: now + 365 * 86_400_000,
      createdAt: now,
      updatedAt: now,
    });
    return ctx.db.insert("bookings", {
      bookingId: args.bookingId,
      externalId: args.externalId,
      leadId,
      start: new Date(startAt).toISOString(),
      end: new Date(startAt + 15 * 60_000).toISOString(),
      startAt,
      endAt: startAt + 15 * 60_000,
      timezone: args.timezone,
      channel: args.channel,
      status: args.status,
      recordingConsentAt: args.recordingConsent ? now : undefined,
      createdAt: now,
      updatedAt: now,
      callAttempts: 0,
    });
  },
});

export const fromWebhook = mutation({
  args: {
    secret: v.string(),
    eventId: v.string(),
    event: v.string(),
    payload: v.string(),
    requestId: v.optional(v.string()),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    if (
      !args.eventId ||
      args.eventId.length > 160 ||
      args.event.length > 80 ||
      args.payload.length > 256_000 ||
      (args.requestId?.length ?? 0) > 100
    ) {
      throw new Error("INVALID_WEBHOOK");
    }
    const duplicate = await ctx.db
      .query("webhookEvents")
      .withIndex("by_event_id", (queryBuilder) =>
        queryBuilder.eq("eventId", args.eventId),
      )
      .unique();
    if (duplicate) return { duplicate: true };
    const now = Date.now();
    await ctx.db.insert("webhookEvents", {
      eventId: args.eventId,
      event: args.event,
      payload: args.payload,
      requestId: args.requestId,
      provider: "easy-appointments",
      status: "received",
      attempts: 0,
      receivedAt: now,
    });
    const normalizedEvent = args.event.toLowerCase();
    if (!["save", "delete"].includes(normalizedEvent)) {
      return { ignored: true };
    }
    let payload: { id?: number | string; appointment?: { id?: number | string } };
    try {
      payload = JSON.parse(args.payload) as typeof payload;
    } catch {
      throw new Error("INVALID_WEBHOOK_PAYLOAD");
    }
    const externalId = String(
      payload.appointment?.id ?? payload.id ?? "",
    ).slice(0, 160);
    if (!externalId) return { ignored: true };
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_external_id", (queryBuilder) =>
        queryBuilder.eq("externalId", externalId),
      )
      .unique();
    if (booking) {
      await ctx.db.patch(booking._id, {
        status: normalizedEvent === "delete" ? "cancelled" : "confirmed",
        updatedAt: now,
      });
    }
    return { updated: Boolean(booking), externalId };
  },
});

export const updateCall = mutation({
  args: {
    secret: v.string(),
    callSid: v.string(),
    status: v.string(),
    payload: v.string(),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    if (
      !args.callSid ||
      args.callSid.length > 160 ||
      !args.status ||
      args.status.length > 80 ||
      args.payload.length > 256_000
    ) {
      throw new Error("INVALID_CALL_WEBHOOK");
    }
    const eventId = `${args.callSid}:${args.status}`;
    const duplicate = await ctx.db
      .query("webhookEvents")
      .withIndex("by_event_id", (queryBuilder) =>
        queryBuilder.eq("eventId", eventId),
      )
      .unique();
    if (duplicate) return null;
    const now = Date.now();
    await ctx.db.insert("webhookEvents", {
      eventId,
      provider: "twilio",
      event: args.status,
      payload: args.payload,
      status: "received",
      attempts: 0,
      receivedAt: now,
    });
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_call_sid", (queryBuilder) =>
        queryBuilder.eq("callSid", args.callSid),
      )
      .unique();
    // Call lifecycle is not an appointment lifecycle. Preserve the appointment
    // state and retain the provider event in webhookEvents for diagnostics.
    if (booking) await ctx.db.patch(booking._id, { updatedAt: now });
    return null;
  },
});
