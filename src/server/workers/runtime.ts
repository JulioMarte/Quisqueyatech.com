import type { SQLiteDatabase } from "../db/sqlite";
import { AdminSecurityService } from "../services/admin-security";
import { ContentService } from "../services/content";
import { RetentionService } from "../services/retention";
import { WebhookDeliveryWorker, type WebhookTransport } from "./webhook-delivery";

export interface RuntimeWorkerCadence {
  publishMs: number;
  retentionMs: number;
  securityCleanupMs: number;
}

const DEFAULT_CADENCE: RuntimeWorkerCadence = {
  publishMs: 60_000,
  retentionMs: 60 * 60_000,
  securityCleanupMs: 60 * 60_000,
};

export class RuntimeWorker {
  private readonly webhook: WebhookDeliveryWorker;
  private readonly content: ContentService;
  private readonly retention: RetentionService;
  private readonly security: AdminSecurityService;
  private nextPublishAt = 0;
  private nextRetentionAt = 0;
  private nextSecurityCleanupAt = 0;

  constructor(
    database: SQLiteDatabase,
    transport?: WebhookTransport,
    private readonly clock: () => number = Date.now,
    private readonly cadence: RuntimeWorkerCadence = DEFAULT_CADENCE,
  ) {
    this.webhook = new WebhookDeliveryWorker(database, transport, clock);
    this.content = new ContentService(database);
    this.retention = new RetentionService(database);
    this.security = new AdminSecurityService(database);
  }

  async tick() {
    const now = this.clock();
    const delivered = await this.webhook.processDue();
    let published = 0;
    let retention: ReturnType<RetentionService["cleanup"]> | null = null;
    let securityCleaned = false;

    if (now >= this.nextPublishAt) {
      published = this.content.publishDue(now);
      this.nextPublishAt = now + this.cadence.publishMs;
    }
    if (now >= this.nextRetentionAt) {
      retention = this.retention.cleanup(now);
      this.nextRetentionAt = now + this.cadence.retentionMs;
    }
    if (now >= this.nextSecurityCleanupAt) {
      this.security.cleanup(now);
      securityCleaned = true;
      this.nextSecurityCleanupAt = now + this.cadence.securityCleanupMs;
    }

    return { delivered, published, retention, securityCleaned };
  }
}
