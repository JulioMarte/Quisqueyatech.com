import { randomUUID } from "node:crypto";
import { WebhookDeliveryRepository, type WebhookDeliveryRow } from "../db/repositories/webhook-deliveries";
import type { SQLiteDatabase } from "../db/sqlite";

const MAX_ATTEMPTS = 8;
const LEASE_MS = 60_000;
const RETRY_DELAYS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
  6 * 60 * 60_000,
  6 * 60 * 60_000,
];

export interface ClaimedDelivery {
  item: WebhookDeliveryRow;
  attempt: number;
  manual: boolean;
  leaseId: string;
}

export class WebhookDeliveryService {
  private readonly repo: WebhookDeliveryRepository;

  constructor(database: SQLiteDatabase) {
    this.repo = new WebhookDeliveryRepository(database);
  }

  claimDue(now: number, leaseId = randomUUID()): ClaimedDelivery[] {
    return this.repo.database.transaction(() => {
      const claimed: ClaimedDelivery[] = [];
      for (const item of this.repo.due(now, 10)) {
        if (item.status === "processing" && item.attempts > 0) {
          const abandoned = this.repo.getAttempt(item.id, item.attempts);
          if (abandoned && abandoned.completedAt === null) {
            this.repo.finishAttempt(abandoned.id, {
              completedAt: now,
              success: false,
              error: "LEASE_EXPIRED",
              durationMs: Math.max(0, now - abandoned.requestedAt),
            });
          }
          if (item.attempts >= MAX_ATTEMPTS) {
            this.repo.updateDelivery(item.id, {
              status: "failed",
              nextAttemptAt: null,
              leaseId: null,
              leaseExpiresAt: null,
              lastError: "LEASE_EXPIRED",
            });
            continue;
          }
        }

        const attempt = item.attempts + 1;
        const manual = item.status === "manual_pending";
        this.repo.updateDelivery(item.id, {
          status: "processing",
          attempts: attempt,
          leaseId,
          leaseExpiresAt: now + LEASE_MS,
          nextAttemptAt: now + LEASE_MS,
          lastAttemptAt: now,
        });
        this.repo.insertAttempt(item, attempt, manual, leaseId, now);
        claimed.push({ item, attempt, manual, leaseId });
      }
      return claimed;
    });
  }

  finish(input: {
    deliveryId: string;
    leaseId: string;
    attempt: number;
    success: boolean;
    statusCode?: number;
    error?: string;
    durationMs: number;
    now: number;
  }) {
    return this.repo.database.transaction(() => {
      const item = this.repo.get(input.deliveryId);
      if (!item || item.status !== "processing" || item.leaseId !== input.leaseId) return false;
      const history = this.repo.getAttempt(input.deliveryId, input.attempt);
      const error = input.error?.replace(/[\r\n\t]/g, " ").slice(0, 200);
      if (history?.leaseId === input.leaseId) this.repo.finishAttempt(history.id, {
        completedAt: input.now,
        success: input.success,
        statusCode: input.statusCode,
        error,
        durationMs: Math.max(0, Math.floor(input.durationMs)),
      });

      const common = {
        attempts: input.attempt,
        leaseId: null,
        leaseExpiresAt: null,
        lastStatusCode: input.statusCode ?? null,
        lastError: error ?? null,
      };
      if (input.success) {
        this.repo.updateDelivery(item.id, {
          ...common,
          status: "delivered",
          deliveredAt: input.now,
          nextAttemptAt: null,
          lastError: null,
        });
      } else if (input.attempt >= MAX_ATTEMPTS) {
        this.repo.updateDelivery(item.id, { ...common, status: "failed", nextAttemptAt: null });
      } else {
        this.repo.updateDelivery(item.id, {
          ...common,
          status: "pending",
          nextAttemptAt: input.now + RETRY_DELAYS[input.attempt - 1],
        });
      }
      return true;
    });
  }

  retry(eventId: string, now: number) {
    return this.repo.database.transaction(() => {
      const item = this.repo.getByEventId(eventId);
      if (!item) throw new Error("NOT_FOUND");
      if (item.status === "processing" && (item.leaseExpiresAt ?? 0) > now) {
        throw new Error("CONFLICT: delivery is processing");
      }
      this.repo.updateDelivery(item.id, {
        status: "manual_pending",
        nextAttemptAt: now,
        leaseId: null,
        leaseExpiresAt: null,
      });
      return { eventId: item.eventId, attempts: item.attempts };
    });
  }

  attempts(eventId: string) {
    return this.repo.attemptsForEvent(eventId);
  }
}
