import { randomUUID } from "node:crypto";
import type { Locale } from "../../types/ui";
import {
  BookingRepository,
  type AvailabilityConfig,
  type BookingChannel,
  type BookingRow,
  type WeeklyRule,
} from "../db/repositories/bookings";
import type { SQLiteDatabase } from "../db/sqlite";

const ACTIVE_STATUSES = new Set(["confirmed", "rescheduled"]);

export interface AvailabilityInput {
  date: string;
  timezone: string;
  locale: Locale;
}

export interface BookingCreateInput {
  bookingId: string;
  firstName: string;
  lastName: string;
  company?: string;
  role?: string;
  country: string;
  locale: Locale;
  email: string;
  phone: string;
  notes?: string;
  recordingConsent: boolean;
  start: string;
  timezone: string;
  channel: BookingChannel;
}

export interface ProviderUpsertInput extends BookingCreateInput {
  externalId?: string;
  processingConsent: boolean;
  status: string;
  createdAt: number;
}

function assertTimeZone(timezone: string) {
  if (!timezone || timezone.length > 80 || timezone !== timezone.trim()) throw new Error("INVALID_TIMEZONE");
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
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function addCivilDays(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

function assertTime(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("INVALID_LOCAL_TIME");
}

function timeInMinutes(value: string) {
  assertTime(value);
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function assertWeekly(weekly: WeeklyRule[]) {
  if (weekly.length < 1 || weekly.length > 7) throw new Error("INVALID_WEEKLY_RULES");
  const weekdays = new Set<number>();
  for (const rule of weekly) {
    if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) throw new Error("INVALID_WEEKLY_RULES");
    if (weekdays.has(rule.weekday)) throw new Error("DUPLICATE_WEEKDAY");
    weekdays.add(rule.weekday);
    if (timeInMinutes(rule.start) >= timeInMinutes(rule.end)) throw new Error("INVALID_TIME_RANGE");
  }
}

function assertRules(config: AvailabilityConfig) {
  assertTimeZone(config.timezone);
  assertWeekly(config.weekly);
  if (
    !Number.isInteger(config.durationMinutes) || config.durationMinutes < 5 || config.durationMinutes > 480 ||
    !Number.isInteger(config.bufferMinutes) || config.bufferMinutes < 0 || config.bufferMinutes > 1440 ||
    !Number.isInteger(config.minimumNoticeHours) || config.minimumNoticeHours < 0 || config.minimumNoticeHours > 8760 ||
    !Number.isInteger(config.horizonDays) || config.horizonDays < 1 || config.horizonDays > 365
  ) throw new Error("INVALID_SCHEDULING_LIMITS");
}

function localParts(instant: Date, timezone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant).map((part) => [part.type, part.value]));
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
      Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute),
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

function appointmentSearchText(values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)).join(" ").toLocaleLowerCase();
}

function assertBookingInput(input: BookingCreateInput) {
  assertTimeZone(input.timezone);
  if (
    !input.bookingId.trim() || input.bookingId.length > 120 ||
    !input.firstName.trim() || input.firstName.length > 60 ||
    !input.lastName.trim() || input.lastName.length > 80 ||
    (input.company?.length ?? 0) > 120 || (input.role?.length ?? 0) > 100 ||
    !input.country.trim() || input.country.length > 80 || input.email.length > 160 ||
    input.phone.length > 24 || (input.notes?.length ?? 0) > 1000
  ) throw new Error("INVALID_BOOKING");
}

export class AgendaService {
  private readonly repo: BookingRepository;

  constructor(
    database: SQLiteDatabase,
    private readonly clock: () => number = Date.now,
    private readonly id: () => string = randomUUID,
  ) {
    this.repo = new BookingRepository(database);
  }

  private scheduleForDate(config: AvailabilityConfig, date: string) {
    const exception = this.repo.getException(date);
    if (exception && exception.available === 0) return null;
    const rule = config.weekly.find((item) => item.weekday === weekdayFor(date));
    const start = exception?.start ?? rule?.start;
    const end = exception?.end ?? rule?.end;
    if ((!rule?.enabled && exception?.available !== 1) || !start || !end) return null;
    return { start, end };
  }

  private assertBookableSlot(startMs: number, startIso: string, config: AvailabilityConfig, now: number) {
    const earliest = now + config.minimumNoticeHours * 3_600_000;
    const latest = now + config.horizonDays * 86_400_000;
    if (!Number.isFinite(startMs) || new Date(startMs).toISOString() !== startIso || startMs < earliest || startMs > latest) {
      throw new Error("SLOT_UNAVAILABLE");
    }

    const agendaDate = localDateAt(new Date(startMs), config.timezone);
    const schedule = this.scheduleForDate(config, agendaDate);
    if (!schedule) throw new Error("SLOT_UNAVAILABLE");

    const durationMs = config.durationMinutes * 60_000;
    const stepMs = (config.durationMinutes + config.bufferMinutes) * 60_000;
    const opening = zonedToUtc(agendaDate, schedule.start, config.timezone).getTime();
    const closing = zonedToUtc(agendaDate, schedule.end, config.timezone).getTime();
    if (startMs < opening || startMs + durationMs > closing || (startMs - opening) % stepMs !== 0) {
      throw new Error("SLOT_UNAVAILABLE");
    }
  }

  availability(input: AvailabilityInput) {
    assertTimeZone(input.timezone);
    if (!isCivilDate(input.date)) throw new Error("INVALID_DATE");
    const config = this.repo.getRules();
    assertRules(config);
    const now = this.clock();
    const earliest = now + config.minimumNoticeHours * 3_600_000;
    const latest = now + config.horizonDays * 86_400_000;
    const durationMs = config.durationMinutes * 60_000;
    const stepMs = (config.durationMinutes + config.bufferMinutes) * 60_000;
    const occupied = new Set(
      this.repo.listActiveBetween(Math.max(0, earliest - stepMs), latest + durationMs).flatMap((booking) => [booking.start, booking.startAt === null ? "" : String(booking.startAt)]),
    );
    const slots: Array<{ start: string; label: string }> = [];

    for (let offset = -2; offset <= 2; offset += 1) {
      const agendaDate = addCivilDays(input.date, offset);
      const schedule = this.scheduleForDate(config, agendaDate);
      if (!schedule) continue;
      const opening = zonedToUtc(agendaDate, schedule.start, config.timezone).getTime();
      const closing = zonedToUtc(agendaDate, schedule.end, config.timezone).getTime();
      for (let cursor = opening; cursor + durationMs <= closing; cursor += stepMs) {
        if (cursor < earliest || cursor > latest) continue;
        if (localDateAt(new Date(cursor), input.timezone) !== input.date) continue;
        const iso = new Date(cursor).toISOString();
        if (occupied.has(iso) || occupied.has(String(cursor))) continue;
        slots.push({
          start: iso,
          label: new Intl.DateTimeFormat(input.locale === "es" ? "es-DO" : "en-US", {
            timeZone: input.timezone, hour: "numeric", minute: "2-digit",
          }).format(new Date(cursor)),
        });
      }
    }
    return slots.sort((left, right) => left.start.localeCompare(right.start)).slice(0, 100);
  }

  create(input: BookingCreateInput) {
    assertBookingInput(input);
    return this.repo.db.transaction(() => {
      const duplicate = this.repo.getByBookingId(input.bookingId);
      if (duplicate) return { bookingId: duplicate.bookingId, status: duplicate.status, confirmed: ACTIVE_STATUSES.has(duplicate.status) };

      const config = this.repo.getRules();
      assertRules(config);
      const now = this.clock();
      const startMs = Date.parse(input.start);
      this.assertBookableSlot(startMs, input.start, config, now);
      if (this.repo.findActiveAt(startMs, input.start)) throw new Error("SLOT_UNAVAILABLE");

      const endMs = startMs + config.durationMinutes * 60_000;
      const status = "confirmed";
      const leadId = this.repo.insertLead({ ...input, status, now });
      this.repo.insertBooking({
        bookingId: input.bookingId,
        leadId,
        searchText: appointmentSearchText([
          input.bookingId, input.firstName, input.lastName, input.email, input.phone, input.company, input.role,
        ]),
        start: input.start,
        end: new Date(endMs).toISOString(),
        startAt: startMs,
        endAt: endMs,
        timezone: input.timezone,
        channel: input.channel,
        status,
        recordingConsentAt: input.recordingConsent ? now : undefined,
        now,
      });

      const payload = {
        eventId: this.id(),
        type: "booking.created",
        occurredAt: now,
        attempt: 0,
        appointment: {
          bookingId: input.bookingId,
          start: input.start,
          end: new Date(endMs).toISOString(),
          timezone: input.timezone,
          channel: input.channel,
          status,
        },
        contact: {
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company ?? null,
          role: input.role ?? null,
          country: input.country,
          locale: input.locale,
          email: input.email,
          phone: input.phone,
        },
        changes: null,
      };
      this.repo.insertWebhookDelivery("booking.created", input.bookingId, payload, now);
      return { bookingId: input.bookingId, status, confirmed: true };
    });
  }

  upsertFromProvider(input: ProviderUpsertInput) {
    assertBookingInput(input);
    return this.repo.db.transaction(() => {
      const now = this.clock();
      const startAt = Date.parse(input.start);
      if (!Number.isFinite(startAt)) throw new Error("INVALID_BOOKING_START");
      const current = this.repo.getByBookingId(input.bookingId);
      if (current) {
        this.repo.updateBooking(current.id, { externalId: input.externalId ?? null, status: input.status, updatedAt: now });
        return current.id;
      }
      const leadId = this.repo.insertLead({ ...input, status: input.status, now });
      return this.repo.insertBooking({
        bookingId: input.bookingId,
        externalId: input.externalId,
        leadId,
        searchText: appointmentSearchText([
          input.bookingId, input.externalId, input.firstName, input.lastName, input.email, input.phone, input.company, input.role,
        ]),
        start: new Date(startAt).toISOString(),
        end: new Date(startAt + 15 * 60_000).toISOString(),
        startAt,
        endAt: startAt + 15 * 60_000,
        timezone: input.timezone,
        channel: input.channel,
        status: input.status,
        recordingConsentAt: input.recordingConsent ? now : undefined,
        now,
      });
    });
  }

  applyEasyAppointmentsWebhook(input: { eventId: string; event: string; payload: string; requestId?: string }) {
    if (!input.eventId || input.eventId.length > 160 || input.event.length > 80 || input.payload.length > 256_000 || (input.requestId?.length ?? 0) > 100) {
      throw new Error("INVALID_WEBHOOK");
    }
    return this.repo.db.transaction(() => {
      const now = this.clock();
      if (!this.repo.insertWebhookEventIfAbsent({ ...input, provider: "easy-appointments", now })) return { duplicate: true };
      const event = input.event.toLowerCase();
      if (event !== "save" && event !== "delete") return { ignored: true };
      let payload: { id?: number | string; appointment?: { id?: number | string } };
      try { payload = JSON.parse(input.payload) as typeof payload; } catch { throw new Error("INVALID_WEBHOOK_PAYLOAD"); }
      const externalId = String(payload.appointment?.id ?? payload.id ?? "").slice(0, 160);
      if (!externalId) return { ignored: true };
      const booking = this.repo.getByExternalId(externalId);
      if (booking) this.repo.updateBooking(booking.id, { status: event === "delete" ? "cancelled" : "confirmed", updatedAt: now });
      return { updated: Boolean(booking), externalId };
    });
  }

  recordCallWebhook(input: { callSid: string; status: string; payload: string }) {
    if (!input.callSid || input.callSid.length > 160 || !input.status || input.status.length > 80 || input.payload.length > 256_000) {
      throw new Error("INVALID_CALL_WEBHOOK");
    }
    return this.repo.db.transaction(() => {
      const now = this.clock();
      const eventId = `${input.callSid}:${input.status}`;
      if (!this.repo.insertWebhookEventIfAbsent({ eventId, provider: "twilio", event: input.status, payload: input.payload, now })) return null;
      const booking = this.repo.getByCallSid(input.callSid);
      if (booking) this.repo.updateBooking(booking.id, { updatedAt: now });
      return null;
    });
  }

  byBookingId(bookingId: string): BookingRow | null {
    return this.repo.getByBookingId(bookingId) ?? null;
  }
}
