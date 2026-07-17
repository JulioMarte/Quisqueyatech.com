/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { fromZonedTime } from "date-fns-tz";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SERVICE_SECRET = "agenda-test-service-secret";

beforeEach(() => {
  process.env.ADMIN_API_SECRET = SERVICE_SECRET;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2027-06-01T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.ADMIN_API_SECRET;
});

function nextWeekdayAtTen() {
  const local = new Date();
  local.setDate(local.getDate() + 3);
  while ([0, 6].includes(local.getDay())) local.setDate(local.getDate() + 1);
  const date = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
  return fromZonedTime(`${date} 10:00`, "America/Santo_Domingo").toISOString();
}

function input(bookingId: string, start: string) {
  return {
    serviceSecret: SERVICE_SECRET,
    bookingId,
    firstName: "Ana",
    lastName: "Pérez",
    country: "DO",
    locale: "es" as const,
    email: "ana@example.com",
    phone: "+18095551234",
    notes: "Llamar por WhatsApp",
    recordingConsent: false,
    start,
    timezone: "America/Santo_Domingo",
    channel: "web" as const,
  };
}

test("server-authorized agenda stores canonical timestamps and optional profile fields", async () => {
  const t = convexTest(schema, modules);
  const start = nextWeekdayAtTen();
  await t.mutation(api.agenda.create, input(crypto.randomUUID(), start));
  const booking = await t.run((ctx) => ctx.db.query("bookings").first());
  const lead = booking
    ? await t.run((ctx) => ctx.db.get(booking.leadId))
    : null;
  expect(booking?.startAt).toBe(Date.parse(start));
  expect(booking?.endAt).toBe(Date.parse(start) + 15 * 60_000);
  expect(booking?.start).toBe(start);
  expect(booking?.timezone).toBe("America/Santo_Domingo");
  expect(booking?.searchText).toContain("ana@example.com");
  expect(booking?.createdAt).toBe(Date.now());
  expect(lead?.email).toBe("ana@example.com");
  expect(lead?.notes).toBe("Llamar por WhatsApp");
  expect(lead?.company).toBeUndefined();
  expect(lead?.role).toBeUndefined();
});

test("appointment creation rejects callers without the server secret", async () => {
  const t = convexTest(schema, modules);
  const start = nextWeekdayAtTen();
  await expect(
    t.mutation(api.agenda.create, {
      ...input(crypto.randomUUID(), start),
      serviceSecret: "public-client",
    }),
  ).rejects.toThrow("UNAUTHORIZED");
  expect(await t.run((ctx) => ctx.db.query("bookings").first())).toBeNull();
});

test("legacy webhook mutations reject direct Convex callers", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.bookings.fromWebhook, {
      secret: "public-client",
      eventId: "event-1",
      event: "save",
      payload: "{}",
      receivedAt: 1,
    }),
  ).rejects.toThrow("UNAUTHORIZED");
  await expect(
    t.mutation(api.bookings.updateCall, {
      secret: "public-client",
      callSid: "CA-test",
      status: "completed",
      payload: "{}",
      receivedAt: 1,
    }),
  ).rejects.toThrow("UNAUTHORIZED");
  expect(await t.run((ctx) => ctx.db.query("webhookEvents").first())).toBeNull();
});

test("public availability rejects invalid IANA timezones and civil dates", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.query(api.agenda.availability, {
      date: "2027-06-08",
      timezone: "Not/A_Zone",
      locale: "es",
    }),
  ).rejects.toThrow("INVALID_TIMEZONE");
  await expect(
    t.query(api.agenda.availability, {
      date: "2027-02-30",
      timezone: "America/Santo_Domingo",
      locale: "es",
    }),
  ).rejects.toThrow("INVALID_DATE");
});

test("timestamp index prevents two active bookings for the same instant", async () => {
  const t = convexTest(schema, modules);
  const start = nextWeekdayAtTen();
  await t.mutation(api.agenda.create, input(crypto.randomUUID(), start));
  await expect(
    t.mutation(api.agenda.create, input(crypto.randomUUID(), start)),
  ).rejects.toThrow("SLOT_UNAVAILABLE");
});

test("availability is bounded to the visitor civil date across agenda dates", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("availabilityRules", {
      singleton: "default",
      timezone: "America/Santo_Domingo",
      durationMinutes: 15,
      bufferMinutes: 0,
      minimumNoticeHours: 0,
      horizonDays: 365,
      weekly: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        enabled: true,
        start: "09:00",
        end: "17:00",
      })),
      updatedBy: "test@example.com",
      updatedAt: Date.now(),
    });
  });
  const slots = await t.query(api.agenda.availability, {
    date: "2027-06-21",
    timezone: "Asia/Tokyo",
    locale: "en",
  });
  expect(slots.length).toBeGreaterThan(0);
  expect(slots.some((slot) => slot.start.startsWith("2027-06-20"))).toBe(true);
  expect(slots.some((slot) => slot.start.startsWith("2027-06-21"))).toBe(true);
  for (const slot of slots) {
    expect(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(slot.start)),
    ).toBe("2027-06-21");
  }
});

test("availability labels use explicit locale rather than inferring it from timezone", async () => {
  const t = convexTest(schema, modules);
  const slots = await t.query(api.agenda.availability, {
    date: "2027-06-07",
    timezone: "America/New_York",
    locale: "en",
  });
  expect(slots.length).toBeGreaterThan(0);
  expect(slots[0]?.label).toMatch(/(?:AM|PM)$/);
});

test("invalid stored weekly rules fail closed", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("availabilityRules", {
      singleton: "default",
      timezone: "America/Santo_Domingo",
      durationMinutes: 15,
      bufferMinutes: 0,
      minimumNoticeHours: 0,
      horizonDays: 60,
      weekly: [
        { weekday: 1, enabled: true, start: "17:00", end: "09:00" },
      ],
      updatedBy: "test@example.com",
      updatedAt: Date.now(),
    });
  });
  await expect(
    t.query(api.agenda.availability, {
      date: "2027-06-07",
      timezone: "America/Santo_Domingo",
      locale: "es",
    }),
  ).rejects.toThrow("INVALID_TIME_RANGE");
});
