import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const DEFAULT_RULES = {
  timezone: "America/Santo_Domingo",
  durationMinutes: 15,
  bufferMinutes: 0,
  minimumNoticeHours: 2,
  horizonDays: 60,
  weekly: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    enabled: true,
    start: "09:00",
    end: "17:00",
  })),
};

const activeStatuses = new Set(["confirmed", "rescheduled"]);
const appointmentStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("rescheduled"),
  v.literal("cancelled"),
  v.literal("completed"),
  v.literal("no_show"),
);
const adminTargetStatusValidator = v.union(
  v.literal("cancelled"),
  v.literal("completed"),
  v.literal("no_show"),
);
const weeklyValidator = v.array(
  v.object({
    weekday: v.number(),
    enabled: v.boolean(),
    start: v.string(),
    end: v.string(),
  }),
);

type WeeklyRule = {
  weekday: number;
  enabled: boolean;
  start: string;
  end: string;
};

type AvailabilityConfig = {
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeHours: number;
  horizonDays: number;
  weekly: WeeklyRule[];
};

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
  if (!timezone || timezone.length > 80 || timezone !== timezone.trim()) {
    throw new Error("INVALID_TIMEZONE");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
  } catch {
    throw new Error("INVALID_TIMEZONE");
  }
}

function isCivilDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function addCivilDays(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

function assertTime(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("INVALID_LOCAL_TIME");
  }
}

function timeInMinutes(value: string) {
  assertTime(value);
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function assertWeekly(weekly: WeeklyRule[]) {
  if (weekly.length < 1 || weekly.length > 7) {
    throw new Error("INVALID_WEEKLY_RULES");
  }
  const weekdays = new Set<number>();
  for (const rule of weekly) {
    if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) {
      throw new Error("INVALID_WEEKLY_RULES");
    }
    if (weekdays.has(rule.weekday)) throw new Error("DUPLICATE_WEEKDAY");
    weekdays.add(rule.weekday);
    if (timeInMinutes(rule.start) >= timeInMinutes(rule.end)) {
      throw new Error("INVALID_TIME_RANGE");
    }
  }
}

function assertRules(config: AvailabilityConfig) {
  assertTimeZone(config.timezone);
  assertWeekly(config.weekly);
  if (
    !Number.isInteger(config.durationMinutes) ||
    config.durationMinutes < 5 ||
    config.durationMinutes > 480 ||
    !Number.isInteger(config.bufferMinutes) ||
    config.bufferMinutes < 0 ||
    config.bufferMinutes > 1440 ||
    !Number.isInteger(config.minimumNoticeHours) ||
    config.minimumNoticeHours < 0 ||
    config.minimumNoticeHours > 8760 ||
    !Number.isInteger(config.horizonDays) ||
    config.horizonDays < 1 ||
    config.horizonDays > 365
  ) {
    throw new Error("INVALID_SCHEDULING_LIMITS");
  }
}

function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localDateAt(instant: Date, timezone: string) {
  const parts = localParts(instant, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zonedToUtc(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let result = new Date(desired);
  for (let index = 0; index < 3; index += 1) {
    const parts = localParts(result, timezone);
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    const correction = desired - represented;
    if (!correction) break;
    result = new Date(result.getTime() + correction);
  }
  return result;
}

function weekdayFor(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

async function rules(ctx: QueryCtx | MutationCtx): Promise<AvailabilityConfig> {
  const stored = await ctx.db
    .query("availabilityRules")
    .withIndex("by_singleton", (queryBuilder) =>
      queryBuilder.eq("singleton", "default"),
    )
    .unique();
  const config = stored ?? DEFAULT_RULES;
  assertRules(config);
  return config;
}

function eventPayload(
  type: string,
  bookingId: string,
  occurredAt: number,
  appointment: unknown,
  contact: unknown,
  changes?: unknown,
) {
  return {
    eventId: crypto.randomUUID(),
    type,
    occurredAt,
    attempt: 0,
    appointment,
    contact,
    changes: changes ?? null,
  };
}

type EventBooking = {
  bookingId: string;
  start: string;
  end?: string;
  startAt?: number;
  endAt?: number;
  timezone: string;
  channel: "web" | "phone";
  status: string;
};
type EventLead = {
  firstName: string;
  lastName: string;
  company?: string;
  role?: string;
  country: string;
  locale: "es" | "en";
  email: string;
  phone: string;
};

async function enqueue(
  ctx: MutationCtx,
  type: string,
  booking: EventBooking,
  lead: EventLead,
  changes?: unknown,
) {
  const now = Date.now();
  const startAt = booking.startAt ?? Date.parse(booking.start);
  const endAt = booking.endAt ??
    (booking.end ? Date.parse(booking.end) : undefined);
  const payload = eventPayload(
    type,
    booking.bookingId,
    now,
    {
      bookingId: booking.bookingId,
      start: new Date(startAt).toISOString(),
      end: endAt === undefined ? null : new Date(endAt).toISOString(),
      timezone: booking.timezone,
      channel: booking.channel,
      status: booking.status,
    },
    {
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company ?? null,
      role: lead.role ?? null,
      country: lead.country,
      locale: lead.locale,
      email: lead.email,
      phone: lead.phone,
    },
    changes,
  );
  await ctx.db.insert("webhookDeliveries", {
    eventId: payload.eventId,
    type,
    bookingId: booking.bookingId,
    payload,
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
  });
  return payload.eventId;
}

async function scheduleForAgendaDate(
  ctx: QueryCtx,
  config: AvailabilityConfig,
  agendaDate: string,
) {
  const exception = await ctx.db
    .query("availabilityExceptions")
    .withIndex("by_date", (queryBuilder) => queryBuilder.eq("date", agendaDate))
    .unique();
  if (exception && !exception.available) return null;
  const rule = config.weekly.find(
    (item) => item.weekday === weekdayFor(agendaDate),
  );
  const start = exception?.start ?? rule?.start;
  const end = exception?.end ?? rule?.end;
  if ((!rule?.enabled && !exception?.available) || !start || !end) return null;
  return { start, end };
}

export const availability = query({
  args: {
    date: v.string(),
    timezone: v.string(),
    locale: v.union(v.literal("es"), v.literal("en")),
  },
  handler: async (ctx, args) => {
    assertTimeZone(args.timezone);
    if (!isCivilDate(args.date)) throw new Error("INVALID_DATE");
    const config = await rules(ctx);
    const now = Date.now();
    const earliest = now + config.minimumNoticeHours * 3_600_000;
    const latest = now + config.horizonDays * 86_400_000;
    const durationMs = config.durationMinutes * 60_000;
    const stepMs =
      (config.durationMinutes + config.bufferMinutes) * 60_000;
    const slots: { start: string; label: string }[] = [];

    // The visitor's civil day can overlap two agenda dates (or three at the
    // extreme IANA offsets). Generate a bounded superset in the agenda zone,
    // then retain only instants that display on the requested visitor date.
    for (let offset = -2; offset <= 2; offset += 1) {
      const agendaDate = addCivilDays(args.date, offset);
      const schedule = await scheduleForAgendaDate(ctx, config, agendaDate);
      if (!schedule) continue;
      const opening = zonedToUtc(agendaDate, schedule.start, config.timezone);
      const closing = zonedToUtc(agendaDate, schedule.end, config.timezone);
      for (
        let cursor = opening.getTime();
        cursor + durationMs <= closing.getTime();
        cursor += stepMs
      ) {
        if (cursor < earliest || cursor > latest) continue;
        if (localDateAt(new Date(cursor), args.timezone) !== args.date) continue;
        const iso = new Date(cursor).toISOString();
        const existingAt = await ctx.db
          .query("bookings")
          .withIndex("by_start_at", (queryBuilder) =>
            queryBuilder.eq("startAt", cursor),
          )
          .first();
        const existing = existingAt ??
          (await ctx.db
            .query("bookings")
            .withIndex("by_start", (queryBuilder) =>
              queryBuilder.eq("start", iso),
            )
            .first());
        if (existing && activeStatuses.has(existing.status)) continue;
        slots.push({
          start: iso,
          label: new Intl.DateTimeFormat(
            args.locale === "es" ? "es-DO" : "en-US",
            {
              timeZone: args.timezone,
              hour: "numeric",
              minute: "2-digit",
            },
          ).format(new Date(cursor)),
        });
      }
    }
    return slots.sort((left, right) => left.start.localeCompare(right.start)).slice(0, 100);
  },
});

export const create = mutation({
  args: {
    serviceSecret: v.string(),
    bookingId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    country: v.string(),
    locale: v.union(v.literal("es"), v.literal("en")),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    recordingConsent: v.boolean(),
    start: v.string(),
    timezone: v.string(),
    channel: v.union(v.literal("web"), v.literal("phone")),
  },
  handler: async (ctx, args) => {
    requireServer(args.serviceSecret);
    assertTimeZone(args.timezone);
    if (
      !args.bookingId.trim() ||
      args.bookingId.length > 120 ||
      args.firstName.length > 60 ||
      args.lastName.length > 80 ||
      (args.company?.length ?? 0) > 120 ||
      (args.role?.length ?? 0) > 100 ||
      args.country.length > 80 ||
      args.email.length > 160 ||
      args.phone.length > 24 ||
      (args.notes?.length ?? 0) > 1000
    ) {
      throw new Error("INVALID_BOOKING");
    }
    const duplicate = await ctx.db
      .query("bookings")
      .withIndex("by_booking_id", (queryBuilder) =>
        queryBuilder.eq("bookingId", args.bookingId),
      )
      .unique();
    if (duplicate) {
      return {
        bookingId: duplicate.bookingId,
        status: duplicate.status,
        confirmed: activeStatuses.has(duplicate.status),
      };
    }
    const config = await rules(ctx);
    const now = Date.now();
    const startMs = Date.parse(args.start);
    if (
      !Number.isFinite(startMs) ||
      new Date(startMs).toISOString() !== args.start ||
      startMs < now + config.minimumNoticeHours * 3_600_000 ||
      startMs > now + config.horizonDays * 86_400_000
    ) {
      throw new Error("SLOT_UNAVAILABLE");
    }
    const existingAt = await ctx.db
      .query("bookings")
      .withIndex("by_start_at", (queryBuilder) =>
        queryBuilder.eq("startAt", startMs),
      )
      .first();
    const existing = existingAt ??
      (await ctx.db
        .query("bookings")
        .withIndex("by_start", (queryBuilder) =>
          queryBuilder.eq("start", args.start),
        )
        .first());
    if (existing && activeStatuses.has(existing.status)) {
      throw new Error("SLOT_UNAVAILABLE");
    }
    const parts = localParts(new Date(startMs), config.timezone);
    const localDate = `${parts.year}-${parts.month}-${parts.day}`;
    const exception = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_date", (queryBuilder) =>
        queryBuilder.eq("date", localDate),
      )
      .unique();
    const rule = config.weekly.find(
      (item) => item.weekday === weekdayFor(localDate),
    );
    if (exception && !exception.available) throw new Error("SLOT_UNAVAILABLE");
    const opening = exception?.start ?? rule?.start;
    const closing = exception?.end ?? rule?.end;
    if ((!rule?.enabled && !exception?.available) || !opening || !closing) {
      throw new Error("SLOT_UNAVAILABLE");
    }
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    const open = timeInMinutes(opening);
    const close = timeInMinutes(closing);
    if (
      minutes < open ||
      minutes + config.durationMinutes > close ||
      (minutes - open) % (config.durationMinutes + config.bufferMinutes) !== 0
    ) {
      throw new Error("SLOT_UNAVAILABLE");
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
      notes: args.notes,
      source: "internal-agenda",
      status: "confirmed",
      processingConsentAt: now,
      leadExpiresAt: now + 365 * 86_400_000,
      createdAt: now,
      updatedAt: now,
    });
    const endAt = startMs + config.durationMinutes * 60_000;
    const booking = {
      bookingId: args.bookingId,
      leadId,
      start: new Date(startMs).toISOString(),
      end: new Date(endAt).toISOString(),
      startAt: startMs,
      endAt,
      timezone: args.timezone,
      channel: args.channel,
      status: "confirmed",
      recordingConsentAt: args.recordingConsent ? now : undefined,
      createdAt: now,
      updatedAt: now,
      callAttempts: 0,
    };
    await ctx.db.insert("bookings", booking);
    const lead = {
      firstName: args.firstName,
      lastName: args.lastName,
      company: args.company,
      role: args.role,
      country: args.country,
      locale: args.locale,
      email: args.email,
      phone: args.phone,
    };
    await enqueue(ctx, "appointment.created", booking, lead);
    await enqueue(ctx, "appointment.confirmed", booking, lead);
    return { bookingId: args.bookingId, status: "confirmed", confirmed: true };
  },
});

export const adminList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(appointmentStatusValidator),
    channel: v.optional(v.union(v.literal("web"), v.literal("phone"))),
    fromAt: v.optional(v.number()),
    toAt: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.fromAt !== undefined && args.toAt !== undefined && args.fromAt > args.toAt) {
      throw new Error("INVALID_DATE_RANGE");
    }
    const result = args.status
      ? args.fromAt !== undefined && args.toAt !== undefined
        ? await ctx.db.query("bookings").withIndex("by_status_and_start_at", (queryBuilder) => queryBuilder.eq("status", args.status!).gte("startAt", args.fromAt).lte("startAt", args.toAt)).order("desc").paginate(args.paginationOpts)
        : args.fromAt !== undefined
          ? await ctx.db.query("bookings").withIndex("by_status_and_start_at", (queryBuilder) => queryBuilder.eq("status", args.status!).gte("startAt", args.fromAt)).order("desc").paginate(args.paginationOpts)
          : args.toAt !== undefined
            ? await ctx.db.query("bookings").withIndex("by_status_and_start_at", (queryBuilder) => queryBuilder.eq("status", args.status!).lte("startAt", args.toAt)).order("desc").paginate(args.paginationOpts)
            : await ctx.db.query("bookings").withIndex("by_status_and_start_at", (queryBuilder) => queryBuilder.eq("status", args.status!)).order("desc").paginate(args.paginationOpts)
      : args.fromAt !== undefined && args.toAt !== undefined
        ? await ctx.db.query("bookings").withIndex("by_start_at", (queryBuilder) => queryBuilder.gte("startAt", args.fromAt).lte("startAt", args.toAt)).order("desc").paginate(args.paginationOpts)
        : args.fromAt !== undefined
          ? await ctx.db.query("bookings").withIndex("by_start_at", (queryBuilder) => queryBuilder.gte("startAt", args.fromAt)).order("desc").paginate(args.paginationOpts)
          : args.toAt !== undefined
            ? await ctx.db.query("bookings").withIndex("by_start_at", (queryBuilder) => queryBuilder.lte("startAt", args.toAt)).order("desc").paginate(args.paginationOpts)
            : await ctx.db.query("bookings").withIndex("by_start_at").order("desc").paginate(args.paginationOpts);
    const search = args.search?.trim().toLocaleLowerCase().slice(0, 100);
    const mapped = await Promise.all(
      result.page.map(async (booking) => {
        if (args.channel && booking.channel !== args.channel) return null;
        const lead = await ctx.db.get(booking.leadId);
        if (
          search &&
          !`${lead?.firstName ?? ""} ${lead?.lastName ?? ""} ${lead?.email ?? ""} ${lead?.phone ?? ""} ${lead?.company ?? ""} ${booking.bookingId}`
            .toLocaleLowerCase()
            .includes(search)
        ) {
          return null;
        }
        return { ...booking, lead };
      }),
    );
    return { ...result, page: mapped.filter((item) => item !== null) };
  },
});

export const adminDetail = query({
  args: { bookingId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_booking_id", (queryBuilder) =>
        queryBuilder.eq("bookingId", args.bookingId),
      )
      .unique();
    if (!booking) return null;
    const deliveries = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_booking_id", (queryBuilder) =>
        queryBuilder.eq("bookingId", args.bookingId),
      )
      .order("desc")
      .take(50);
    const deliveriesWithHistory = await Promise.all(
      deliveries.map(async (delivery) => ({
        ...delivery,
        history: await ctx.db
          .query("webhookDeliveryAttempts")
          .withIndex("by_delivery_id_and_attempt", (queryBuilder) =>
            queryBuilder.eq("deliveryId", delivery._id),
          )
          .order("desc")
          .take(20),
      })),
    );
    return {
      ...booking,
      lead: await ctx.db.get(booking.leadId),
      audit: await ctx.db
        .query("bookingAudit")
        .withIndex("by_booking_and_created_at", (queryBuilder) =>
          queryBuilder.eq("bookingId", args.bookingId),
        )
        .order("desc")
        .take(50),
      deliveries: deliveriesWithHistory,
    };
  },
});

export const adminTransition = mutation({
  args: { bookingId: v.string(), status: adminTargetStatusValidator },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_booking_id", (queryBuilder) =>
        queryBuilder.eq("bookingId", args.bookingId),
      )
      .unique();
    if (!booking) throw new Error("NOT_FOUND");
    if (booking.status === args.status) return booking;
    if (!activeStatuses.has(booking.status)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }
    const lead = await ctx.db.get(booking.leadId);
    const before = { status: booking.status };
    const now = Date.now();
    await ctx.db.patch(booking._id, { status: args.status, updatedAt: now });
    await ctx.db.patch(booking.leadId, { status: args.status, updatedAt: now });
    await ctx.db.insert("bookingAudit", {
      bookingId: args.bookingId,
      action: args.status,
      actorEmail: admin.email,
      before,
      after: { status: args.status },
      createdAt: now,
    });
    const event =
      args.status === "cancelled"
        ? "appointment.cancelled"
        : args.status === "completed"
          ? "appointment.completed"
          : null;
    if (event && lead) {
      await enqueue(
        ctx,
        event,
        { ...booking, status: args.status },
        lead,
        { status: { from: booking.status, to: args.status } },
      );
    }
    return { ...booking, status: args.status };
  },
});

export const adminRules = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const value = await rules(ctx);
    const exceptions = await ctx.db
      .query("availabilityExceptions")
      .order("desc")
      .take(100);
    return { ...value, exceptions };
  },
});

export const adminTimestampMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const missingStart = await ctx.db
      .query("bookings")
      .withIndex("by_start_at", (queryBuilder) =>
        queryBuilder.eq("startAt", undefined),
      )
      .first();
    const missingEnd = await ctx.db
      .query("bookings")
      .withIndex("by_end_at", (queryBuilder) =>
        queryBuilder.eq("endAt", undefined),
      )
      .first();
    return {
      complete: missingStart === null && missingEnd === null,
      sampleMissingStartBookingId: missingStart?.bookingId,
      sampleMissingEndBookingId: missingEnd?.bookingId,
    };
  },
});

export const adminSaveRules = mutation({
  args: {
    timezone: v.string(),
    durationMinutes: v.number(),
    bufferMinutes: v.number(),
    minimumNoticeHours: v.number(),
    horizonDays: v.number(),
    weekly: weeklyValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    assertRules(args);
    const current = await ctx.db
      .query("availabilityRules")
      .withIndex("by_singleton", (queryBuilder) =>
        queryBuilder.eq("singleton", "default"),
      )
      .unique();
    const value = {
      ...args,
      singleton: "default",
      updatedBy: admin.email,
      updatedAt: Date.now(),
    };
    if (current) await ctx.db.replace(current._id, value);
    else await ctx.db.insert("availabilityRules", value);
    return value;
  },
});

export const adminSaveException = mutation({
  args: {
    date: v.string(),
    available: v.boolean(),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!isCivilDate(args.date) || (args.reason?.length ?? 0) > 500) {
      throw new Error("INVALID_EXCEPTION");
    }
    if ((args.start === undefined) !== (args.end === undefined)) {
      throw new Error("INVALID_EXCEPTION_RANGE");
    }
    if (
      args.start !== undefined &&
      args.end !== undefined &&
      timeInMinutes(args.start) >= timeInMinutes(args.end)
    ) {
      throw new Error("INVALID_EXCEPTION_RANGE");
    }
    const current = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_date", (queryBuilder) =>
        queryBuilder.eq("date", args.date),
      )
      .unique();
    const value = {
      ...args,
      createdBy: admin.email,
      createdAt: Date.now(),
    };
    if (current) await ctx.db.replace(current._id, value);
    else await ctx.db.insert("availabilityExceptions", value);
    return value;
  },
});
