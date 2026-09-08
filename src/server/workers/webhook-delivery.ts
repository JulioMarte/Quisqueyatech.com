import type { SQLiteDatabase } from "../db/sqlite";
import { SettingsService } from "../services/settings";
import { deliverWebhook, type DeliveryResult } from "../services/webhook-http";
import { WebhookDeliveryService } from "../services/webhook-delivery";

export type WebhookTransport = (input: {
  url: string;
  encryptedSecret: string;
  eventId: string;
  body: string;
  timestamp: string;
}) => Promise<DeliveryResult>;

export class WebhookDeliveryWorker {
  private readonly settings: SettingsService;
  private readonly deliveries: WebhookDeliveryService;

  constructor(
    database: SQLiteDatabase,
    private readonly transport: WebhookTransport = deliverWebhook,
    private readonly clock: () => number = Date.now,
  ) {
    this.settings = new SettingsService(database);
    this.deliveries = new WebhookDeliveryService(database);
  }

  async processDue() {
    const runtime = this.settings.internalRuntime();
    const enabled = runtime.config.webhookEnabled === true;
    const url = typeof runtime.config.webhookUrl === "string" ? runtime.config.webhookUrl : "";
    const encryptedSecret = runtime.secrets.webhookSecret;
    if (!enabled || !url || !encryptedSecret) return 0;

    const claimed = this.deliveries.claimDue(this.clock());
    await Promise.all(claimed.map(async (claim) => {
      const payload = JSON.parse(claim.item.payload) as Record<string, unknown>;
      const body = JSON.stringify({ ...payload, attempt: claim.attempt });
      const timestamp = String(this.clock());
      let result: DeliveryResult;
      try {
        result = await this.transport({
          url,
          encryptedSecret,
          eventId: claim.item.eventId,
          body,
          timestamp,
        });
      } catch {
        result = { success: false, error: "NETWORK_ERROR", durationMs: 0 };
      }
      this.deliveries.finish({
        deliveryId: claim.item.id,
        leaseId: claim.leaseId,
        attempt: claim.attempt,
        ...result,
        now: this.clock(),
      });
    }));
    return claimed.length;
  }
}
