import { randomUUID } from "node:crypto";
import type { Locale } from "../../types/ui";
import type { SQLiteDatabase } from "../db/sqlite";

const FUNNEL_NAMES = new Set([
  "assessment_started",
  "assessment_completed",
  "assessment_booked",
  "schedule_opened",
  "schedule_slot_selected",
  "lead_captured",
]);

export interface FunnelEventInput {
  sessionId: string;
  locale: Locale;
  name: string;
  assessmentId?: string;
  bookingId?: string;
  path?: string;
  createdAt: number;
}

export class FunnelService {
  constructor(private readonly database: SQLiteDatabase) {}

  track(input: FunnelEventInput) {
    if (
      !input.sessionId.trim() || input.sessionId.length > 160 || !FUNNEL_NAMES.has(input.name) ||
      (input.path?.length ?? 0) > 500 || (input.assessmentId?.length ?? 0) > 120 ||
      (input.bookingId?.length ?? 0) > 120 || !Number.isFinite(input.createdAt)
    ) throw new Error("INVALID_FUNNEL_EVENT");

    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO funnelEvents(id,sessionId,locale,name,assessmentId,bookingId,path,createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,input.sessionId,input.locale,input.name,input.assessmentId ?? null,input.bookingId ?? null,input.path ?? null,input.createdAt,
    );
    return id;
  }
}
