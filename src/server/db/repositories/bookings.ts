import { randomUUID } from "node:crypto";
import type { Locale } from "../../../types/ui";
import { getDatabase, type SQLiteDatabase } from "../sqlite";

export type BookingChannel = "web" | "phone";
export type BookingStatus = "confirmed" | "rescheduled" | "cancelled" | "completed" | "no_show" | string;

export interface WeeklyRule {
  weekday: number;
  enabled: boolean;
  start: string;
  end: string;
}

export interface AvailabilityConfig {
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeHours: number;
  horizonDays: number;
  weekly: WeeklyRule[];
}

export interface BookingRow extends Record<string, unknown> {
  id: string;
  bookingId: string;
  externalId: string | null;
  leadId: string;
  searchText: string | null;
  start: string;
  end: string | null;
  startAt: number | null;
  endAt: number | null;
  timezone: string;
  channel: BookingChannel;
  status: BookingStatus;
  previousStart: string | null;
  previousStartAt: number | null;
  recordingConsentAt: number | null;
  createdAt: number;
  updatedAt: number;
  callSid: string | null;
  callAttempts: number | null;
}

export interface LeadRow extends Record<string, unknown> {
  id: string;
  bookingId: string | null;
  firstName: string;
  lastName: string;
  company: string | null;
  role: string | null;
  notes: string | null;
  country: string;
  locale: Locale;
  email: string;
  phone: string;
  source: string;
  status: string;
  processingConsentAt: number;
  leadExpiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface AvailabilityExceptionRow extends Record<string, unknown> {
  id: string;
  date: string;
  available: number;
  start: string | null;
  end: string | null;
  reason: string | null;
}

export interface InsertLeadInput {
  bookingId: string;
  firstName: string;
  lastName: string;
  company?: string;
  role?: string;
  notes?: string;
  country: string;
  locale: Locale;
  email: string;
  phone: string;
  status: string;
  now: number;
}

export interface InsertBookingInput {
  bookingId: string;
  externalId?: string;
  leadId: string;
  searchText: string;
  start: string;
  end: string;
  startAt: number;
  endAt: number;
  timezone: string;
  channel: BookingChannel;
  status: BookingStatus;
  recordingConsentAt?: number;
  now: number;
}

const DEFAULT_RULES: AvailabilityConfig = {
  timezone: "America/Santo_Domingo",
  durationMinutes: 15,
  bufferMinutes: 0,
  minimumNoticeHours: 2,
  horizonDays: 60,
  weekly: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, enabled: true, start: "09:00", end: "17:00" })),
};

export class BookingRepository {
  constructor(private readonly database: SQLiteDatabase = getDatabase()) {}

  get db() {
    return this.database;
  }

  getByBookingId(bookingId: string) {
    return this.database.prepare("SELECT * FROM bookings WHERE bookingId = ? LIMIT 1").get(bookingId) as BookingRow | undefined;
  }

  getByExternalId(externalId: string) {
    return this.database.prepare("SELECT * FROM bookings WHERE externalId = ? LIMIT 1").get(externalId) as BookingRow | undefined;
  }

  getByCallSid(callSid: string) {
    return this.database.prepare("SELECT * FROM bookings WHERE callSid = ? LIMIT 1").get(callSid) as BookingRow | undefined;
  }

  getLead(leadId: string) {
    return this.database.prepare("SELECT * FROM leads WHERE id = ? LIMIT 1").get(leadId) as LeadRow | undefined;
  }

  findActiveAt(startAt: number, startIso: string) {
    return this.database.prepare(`
      SELECT * FROM bookings
      WHERE status IN ('confirmed','rescheduled')
        AND (startAt = ? OR start = ?)
      LIMIT 1
    `).get(startAt, startIso) as BookingRow | undefined;
  }

  listActiveBetween(startAt: number, endAt: number, limit = 500) {
    return this.database.prepare(`
      SELECT * FROM bookings
      WHERE status IN ('confirmed','rescheduled')
        AND startAt IS NOT NULL
        AND startAt >= ? AND startAt <= ?
      ORDER BY startAt ASC
      LIMIT ?
    `).all(startAt, endAt, limit) as BookingRow[];
  }

  getRules(): AvailabilityConfig {
    const row = this.database.prepare("SELECT * FROM availabilityRules WHERE singleton = 'default' LIMIT 1").get() as Record<string, unknown> | undefined;
    if (!row) return structuredClone(DEFAULT_RULES);
    return {
      timezone: String(row.timezone),
      durationMinutes: Number(row.durationMinutes),
      bufferMinutes: Number(row.bufferMinutes),
      minimumNoticeHours: Number(row.minimumNoticeHours),
      horizonDays: Number(row.horizonDays),
      weekly: JSON.parse(String(row.weekly)) as WeeklyRule[],
    };
  }

  getException(date: string) {
    return this.database.prepare("SELECT * FROM availabilityExceptions WHERE date = ? ORDER BY creationTime DESC LIMIT 1").get(date) as AvailabilityExceptionRow | undefined;
  }

  insertLead(input: InsertLeadInput) {
    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO leads(
        id, bookingId, firstName, lastName, company, role, notes, country, locale,
        email, phone, source, status, processingConsentAt, leadExpiresAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled-assessment', ?, ?, ?, ?, ?)
    `).run(
      id, input.bookingId, input.firstName, input.lastName, input.company ?? null, input.role ?? null,
      input.notes ?? null, input.country, input.locale, input.email, input.phone, input.status,
      input.now, input.now + 365 * 86_400_000, input.now, input.now,
    );
    return id;
  }

  insertBooking(input: InsertBookingInput) {
    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO bookings(
        id, bookingId, externalId, leadId, searchText, start, end, startAt, endAt,
        timezone, channel, status, recordingConsentAt, createdAt, updatedAt, callAttempts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id, input.bookingId, input.externalId ?? null, input.leadId, input.searchText,
      input.start, input.end, input.startAt, input.endAt, input.timezone, input.channel,
      input.status, input.recordingConsentAt ?? null, input.now, input.now,
    );
    return id;
  }

  updateBooking(id: string, values: Partial<Pick<BookingRow, "externalId" | "status" | "updatedAt" | "start" | "end" | "startAt" | "endAt" | "previousStart" | "previousStartAt" | "callSid" | "callAttempts">>) {
    const entries = Object.entries(values).filter(([, value]) => value !== undefined);
    if (!entries.length) return;
    const assignments = entries.map(([key]) => `"${key}" = ?`).join(", ");
    this.database.prepare(`UPDATE bookings SET ${assignments} WHERE id = ?`).run(...entries.map(([, value]) => value), id);
  }

  insertWebhookDelivery(type: string, bookingId: string, payload: unknown, now: number) {
    const id = randomUUID();
    const eventId = typeof payload === "object" && payload && "eventId" in payload ? String((payload as { eventId: unknown }).eventId) : randomUUID();
    this.database.prepare(`
      INSERT INTO webhookDeliveries(id, eventId, type, bookingId, payload, status, attempts, nextAttemptAt, createdAt)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `).run(id, eventId, type, bookingId, JSON.stringify(payload), now, now);
    return eventId;
  }

  insertWebhookEventIfAbsent(input: { eventId: string; provider: string; event: string; payload: string; requestId?: string; now: number }) {
    const result = this.database.prepare(`
      INSERT OR IGNORE INTO webhookEvents(id, eventId, provider, event, payload, status, attempts, requestId, receivedAt)
      VALUES (?, ?, ?, ?, ?, 'received', 0, ?, ?)
    `).run(randomUUID(), input.eventId, input.provider, input.event, input.payload, input.requestId ?? null, input.now);
    return result.changes > 0;
  }

  search(query: string, status?: string, channel?: BookingChannel, limit = 50) {
    const clauses = ["bookingsSearch MATCH ?"];
    const params: Array<string | number> = [query];
    if (status) { clauses.push("b.status = ?"); params.push(status); }
    if (channel) { clauses.push("b.channel = ?"); params.push(channel); }
    params.push(limit);
    return this.database.prepare(`
      SELECT b.* FROM bookingsSearch
      JOIN bookings b ON b.rowid = bookingsSearch.rowid
      WHERE ${clauses.join(" AND ")}
      ORDER BY rank
      LIMIT ?
    `).all(...params) as BookingRow[];
  }
}
