import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { BookingRepository } from "../../src/server/db/repositories/bookings";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { AgendaService } from "../../src/server/services/agenda";

const NOW = Date.parse("2026-09-07T12:00:00.000Z");
const SLOT = "2026-09-07T15:00:00.000Z"; // 11:00 America/Santo_Domingo

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-agenda-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  let sequence = 0;
  const service = new AgendaService(database, () => NOW, () => `event-${++sequence}`);
  const repo = new BookingRepository(database);
  return {
    database,
    service,
    repo,
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function booking(bookingId: string, start = SLOT) {
  return {
    bookingId,
    firstName: "Ana",
    lastName: "Perez",
    company: "Clinica Dental Norte",
    role: "Administradora",
    country: "DO",
    locale: "es" as const,
    email: "ana@example.com",
    phone: "+18095550000",
    notes: "Evaluacion inicial",
    recordingConsent: true,
    start,
    timezone: "America/Santo_Domingo",
    channel: "web" as const,
  };
}

test("availability preserves the Convex timezone semantics", () => {
  const f = fixture();
  try {
    const slots = f.service.availability({
      date: "2026-09-07",
      timezone: "America/Santo_Domingo",
      locale: "es",
    });
    assert.ok(slots.some((slot) => slot.start === SLOT));
  } finally {
    f.close();
  }
});

test("booking creation is atomic, idempotent and emits an outbox event", () => {
  const f = fixture();
  try {
    const first = f.service.create(booking("booking-1"));
    assert.deepEqual(first, { bookingId: "booking-1", status: "confirmed", confirmed: true });

    const stored = f.service.byBookingId("booking-1");
    assert.equal(stored?.start, SLOT);
    assert.equal(stored?.status, "confirmed");
    assert.ok(stored?.leadId);
    assert.equal(f.repo.getLead(stored!.leadId)?.email, "ana@example.com");

    const delivery = f.database.prepare("SELECT type,status,bookingId FROM webhookDeliveries WHERE bookingId = ?").get("booking-1") as Record<string, unknown>;
    assert.equal(delivery.type, "booking.created");
    assert.equal(delivery.status, "pending");

    const duplicate = f.service.create(booking("booking-1"));
    assert.deepEqual(duplicate, first);
    assert.equal(Number((f.database.prepare("SELECT count(*) AS count FROM bookings").get() as { count: number }).count), 1);
    assert.equal(Number((f.database.prepare("SELECT count(*) AS count FROM webhookDeliveries").get() as { count: number }).count), 1);
  } finally {
    f.close();
  }
});

test("a second booking cannot claim an already-active slot", () => {
  const f = fixture();
  try {
    f.service.create(booking("booking-1"));
    assert.throws(() => f.service.create(booking("booking-2")), /SLOT_UNAVAILABLE/);
    assert.equal(Number((f.database.prepare("SELECT count(*) AS count FROM bookings").get() as { count: number }).count), 1);
  } finally {
    f.close();
  }
});

test("availability exceptions close the agenda date", () => {
  const f = fixture();
  try {
    f.database.prepare(`
      INSERT INTO availabilityExceptions(id,date,available,createdBy,createdAt)
      VALUES ('exception-1','2026-09-07',0,'test',?)
    `).run(NOW);
    const slots = f.service.availability({ date: "2026-09-07", timezone: "America/Santo_Domingo", locale: "es" });
    assert.equal(slots.length, 0);
    assert.throws(() => f.service.create(booking("booking-closed")), /SLOT_UNAVAILABLE/);
  } finally {
    f.close();
  }
});

test("provider webhooks are idempotent and do not confuse call state with appointment state", () => {
  const f = fixture();
  try {
    f.service.upsertFromProvider({
      ...booking("booking-provider"),
      externalId: "ea-42",
      processingConsent: true,
      status: "confirmed",
      createdAt: NOW,
    });

    const cancelled = f.service.applyEasyAppointmentsWebhook({
      eventId: "easy-1",
      event: "delete",
      payload: JSON.stringify({ appointment: { id: "ea-42" } }),
    });
    assert.deepEqual(cancelled, { updated: true, externalId: "ea-42" });
    assert.equal(f.service.byBookingId("booking-provider")?.status, "cancelled");

    assert.deepEqual(f.service.applyEasyAppointmentsWebhook({
      eventId: "easy-1",
      event: "delete",
      payload: JSON.stringify({ appointment: { id: "ea-42" } }),
    }), { duplicate: true });

    f.repo.updateBooking(f.service.byBookingId("booking-provider")!.id, { callSid: "CA123", status: "confirmed", updatedAt: NOW });
    f.service.recordCallWebhook({ callSid: "CA123", status: "completed", payload: "{}" });
    assert.equal(f.service.byBookingId("booking-provider")?.status, "confirmed");
  } finally {
    f.close();
  }
});

test("booking FTS remains available through the repository", () => {
  const f = fixture();
  try {
    f.service.create(booking("booking-search"));
    const results = f.repo.search("dental");
    assert.equal(results[0]?.bookingId, "booking-search");
  } finally {
    f.close();
  }
});
