import { randomUUID } from "node:crypto";
import { getDatabase, type SQLiteDatabase } from "../sqlite";

export interface WebhookDeliveryRow extends Record<string, unknown> {
  id: string;
  eventId: string;
  type: string;
  bookingId: string | null;
  payload: string;
  status: string;
  attempts: number;
  nextAttemptAt: number | null;
  lastStatusCode: number | null;
  lastError: string | null;
  leaseId: string | null;
  leaseExpiresAt: number | null;
  lastAttemptAt: number | null;
  createdAt: number;
  deliveredAt: number | null;
}

export interface WebhookDeliveryAttemptRow extends Record<string, unknown> {
  id: string;
  deliveryId: string;
  eventId: string;
  attempt: number;
  manual: number;
  requestedAt: number;
  completedAt: number | null;
  success: number | null;
  statusCode: number | null;
  error: string | null;
  durationMs: number | null;
  leaseId: string;
}

export class WebhookDeliveryRepository {
  constructor(readonly database: SQLiteDatabase = getDatabase()) {}

  due(now: number, limit = 10) {
    return this.database.prepare(`
      SELECT * FROM webhookDeliveries
      WHERE status IN ('pending','manual_pending','processing')
        AND nextAttemptAt IS NOT NULL
        AND nextAttemptAt <= ?
      ORDER BY nextAttemptAt ASC, createdAt ASC
      LIMIT ?
    `).all(now, limit) as WebhookDeliveryRow[];
  }

  get(id: string) {
    return this.database.prepare("SELECT * FROM webhookDeliveries WHERE id=? LIMIT 1").get(id) as WebhookDeliveryRow | undefined;
  }

  getByEventId(eventId: string) {
    return this.database.prepare("SELECT * FROM webhookDeliveries WHERE eventId=? LIMIT 1").get(eventId) as WebhookDeliveryRow | undefined;
  }

  getAttempt(deliveryId: string, attempt: number) {
    return this.database.prepare("SELECT * FROM webhookDeliveryAttempts WHERE deliveryId=? AND attempt=? LIMIT 1").get(deliveryId, attempt) as WebhookDeliveryAttemptRow | undefined;
  }

  updateDelivery(id: string, values: {
    status?: string; attempts?: number; nextAttemptAt?: number | null; lastStatusCode?: number | null;
    lastError?: string | null; leaseId?: string | null; leaseExpiresAt?: number | null;
    lastAttemptAt?: number | null; deliveredAt?: number | null;
  }) {
    const entries = Object.entries(values).filter(([, value]) => value !== undefined);
    if (!entries.length) return;
    const sql = entries.map(([key]) => `"${key}"=?`).join(",");
    this.database.prepare(`UPDATE webhookDeliveries SET ${sql} WHERE id=?`).run(...entries.map(([, value]) => value ?? null), id);
  }

  insertAttempt(delivery: WebhookDeliveryRow, attempt: number, manual: boolean, leaseId: string, now: number) {
    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO webhookDeliveryAttempts(id,deliveryId,eventId,attempt,manual,requestedAt,leaseId)
      VALUES (?,?,?,?,?,?,?)
    `).run(id, delivery.id, delivery.eventId, attempt, manual ? 1 : 0, now, leaseId);
    return id;
  }

  finishAttempt(id: string, values: {
    completedAt: number; success: boolean; statusCode?: number; error?: string; durationMs: number;
  }) {
    this.database.prepare(`
      UPDATE webhookDeliveryAttempts
      SET completedAt=?,success=?,statusCode=?,error=?,durationMs=?
      WHERE id=?
    `).run(values.completedAt, values.success ? 1 : 0, values.statusCode ?? null, values.error ?? null, values.durationMs, id);
  }

  attemptsForEvent(eventId: string, limit = 50) {
    return this.database.prepare(`
      SELECT * FROM webhookDeliveryAttempts WHERE eventId=? ORDER BY requestedAt DESC LIMIT ?
    `).all(eventId, limit) as WebhookDeliveryAttemptRow[];
  }
}
