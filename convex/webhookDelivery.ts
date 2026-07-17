import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, mutation, query, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import type { Doc } from "./_generated/dataModel";

const MAX_ATTEMPTS = 8;
const LEASE_MS = 60_000;
const retryDelays = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000, 6 * 60 * 60_000, 6 * 60 * 60_000];

type ClaimedDelivery = { item: Doc<"webhookDeliveries">; attempt: number; manual: boolean; leaseId: string };
type DeliveryResult = { success: boolean; statusCode?: number; error?: string; durationMs: number };

export const claimDue = internalMutation({
  args: { now: v.number(), leaseId: v.string() },
  handler: async (ctx, args): Promise<ClaimedDelivery[]> => {
    const pending = await ctx.db.query("webhookDeliveries")
      .withIndex("by_status_and_next_attempt_at", (q) => q.eq("status", "pending").lte("nextAttemptAt", args.now)).take(10);
    const manual = await ctx.db.query("webhookDeliveries")
      .withIndex("by_status_and_next_attempt_at", (q) => q.eq("status", "manual_pending").lte("nextAttemptAt", args.now)).take(10);
    const expired = await ctx.db.query("webhookDeliveries")
      .withIndex("by_status_and_next_attempt_at", (q) => q.eq("status", "processing").lte("nextAttemptAt", args.now)).take(10);
    const selected = [...manual, ...pending, ...expired].sort((a, b) => (a.nextAttemptAt ?? 0) - (b.nextAttemptAt ?? 0)).slice(0, 10);
    const claimed: ClaimedDelivery[] = [];
    for (const item of selected) {
      if (item.status === "processing" && item.attempts > 0) {
        const abandoned = await ctx.db.query("webhookDeliveryAttempts")
          .withIndex("by_delivery_id_and_attempt", (q) => q.eq("deliveryId", item._id).eq("attempt", item.attempts)).unique();
        if (abandoned && abandoned.completedAt === undefined) await ctx.db.patch(abandoned._id, {
          completedAt: args.now,
          success: false,
          error: "LEASE_EXPIRED",
          durationMs: Math.max(0, args.now - abandoned.requestedAt),
        });
        if (item.attempts >= MAX_ATTEMPTS) {
          await ctx.db.patch(item._id, {
            status: "failed",
            nextAttemptAt: undefined,
            leaseId: undefined,
            leaseExpiresAt: undefined,
            lastError: "LEASE_EXPIRED",
          });
          continue;
        }
      }
      const attempt = item.attempts + 1;
      const manualAttempt = item.status === "manual_pending";
      await ctx.db.patch(item._id, {
        status: "processing",
        attempts: attempt,
        leaseId: args.leaseId,
        leaseExpiresAt: args.now + LEASE_MS,
        nextAttemptAt: args.now + LEASE_MS,
        lastAttemptAt: args.now,
      });
      await ctx.db.insert("webhookDeliveryAttempts", {
        deliveryId: item._id,
        eventId: item.eventId,
        attempt,
        manual: manualAttempt,
        requestedAt: args.now,
        leaseId: args.leaseId,
      });
      claimed.push({ item, attempt, manual: manualAttempt, leaseId: args.leaseId });
    }
    return claimed;
  },
});

export const finish = internalMutation({
  args: {
    deliveryId: v.id("webhookDeliveries"), leaseId: v.string(), attempt: v.number(), success: v.boolean(),
    statusCode: v.optional(v.number()), error: v.optional(v.string()), durationMs: v.number(), now: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.deliveryId);
    if (!item || item.status !== "processing" || item.leaseId !== args.leaseId) return false;
    const history = await ctx.db.query("webhookDeliveryAttempts")
      .withIndex("by_delivery_id_and_attempt", (q) => q.eq("deliveryId", args.deliveryId).eq("attempt", args.attempt)).unique();
    const error = args.error?.replace(/[\r\n\t]/g, " ").slice(0, 200);
    if (history?.leaseId === args.leaseId) await ctx.db.patch(history._id, {
      completedAt: args.now, success: args.success, statusCode: args.statusCode, error, durationMs: Math.max(0, Math.floor(args.durationMs)),
    });
    const common = { attempts: args.attempt, leaseId: undefined, leaseExpiresAt: undefined, lastStatusCode: args.statusCode, lastError: error };
    if (args.success) {
      await ctx.db.patch(item._id, { ...common, status: "delivered", deliveredAt: args.now, nextAttemptAt: undefined, lastError: undefined });
    } else if (args.attempt >= MAX_ATTEMPTS) {
      await ctx.db.patch(item._id, { ...common, status: "failed", nextAttemptAt: undefined });
    } else {
      await ctx.db.patch(item._id, { ...common, status: "pending", nextAttemptAt: args.now + retryDelays[args.attempt - 1] });
    }
    return true;
  },
});

async function deliverClaim(ctx: ActionCtx, claimed: ClaimedDelivery, url: string, encryptedSecret: string) {
  const body = JSON.stringify({ ...(claimed.item.payload as Record<string, unknown>), attempt: claimed.attempt });
  const timestamp = String(Date.now());
  const result: DeliveryResult = await ctx.runAction(internal.webhookHttp.deliver, {
    url, encryptedSecret, eventId: claimed.item.eventId, body, timestamp,
  });
  await ctx.runMutation(internal.webhookDelivery.finish, {
    deliveryId: claimed.item._id, leaseId: claimed.leaseId, attempt: claimed.attempt, ...result, now: Date.now(),
  });
}

export const processDue = internalAction({
  args: {},
  handler: async (ctx): Promise<number | null> => {
    const runtime = await ctx.runQuery(internal.settings.internalRuntime, {});
    const config = runtime.config as { webhookEnabled?: boolean; webhookUrl?: string };
    if (!config.webhookEnabled || !config.webhookUrl || !runtime.secrets.webhookSecret) return null;
    const leaseId = crypto.randomUUID();
    const claimed: ClaimedDelivery[] = await ctx.runMutation(internal.webhookDelivery.claimDue, { now: Date.now(), leaseId });
    await Promise.all(claimed.map((item) => deliverClaim(ctx, item, config.webhookUrl!, runtime.secrets.webhookSecret)));
    return claimed.length;
  },
});

export const adminRetry = mutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.query("webhookDeliveries").withIndex("by_event_id", (q) => q.eq("eventId", args.eventId)).unique();
    if (!item) throw new Error("NOT_FOUND");
    if (item.status === "processing" && (item.leaseExpiresAt ?? 0) > Date.now()) throw new Error("CONFLICT: delivery is processing");
    await ctx.db.patch(item._id, { status: "manual_pending", nextAttemptAt: Date.now(), leaseId: undefined, leaseExpiresAt: undefined });
    return { eventId: item.eventId, attempts: item.attempts };
  },
});

export const adminAttempts = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("webhookDeliveryAttempts").withIndex("by_event_id_and_requested_at", (q) => q.eq("eventId", args.eventId)).order("desc").take(50);
  },
});

export const adminTest = action({
  args: {},
  handler: async (ctx): Promise<{ eventId: string; success: boolean; statusCode?: number; error?: string; durationMs: number }> => {
    await requireAdmin(ctx);
    const runtime = await ctx.runQuery(internal.settings.internalRuntime, {});
    const config = runtime.config as { webhookEnabled?: boolean; webhookUrl?: string };
    if (!config.webhookUrl || !runtime.secrets.webhookSecret) throw new Error("CONFIGURATION_ERROR: webhook URL and secret are required");
    const eventId = crypto.randomUUID();
    const body = JSON.stringify({ eventId, type: "webhook.test", occurredAt: new Date().toISOString(), attempt: 1, appointment: null, contact: null, changes: {} });
    const result: DeliveryResult = await ctx.runAction(internal.webhookHttp.deliver, {
      url: config.webhookUrl, encryptedSecret: runtime.secrets.webhookSecret, eventId, body, timestamp: String(Date.now()),
    });
    return { eventId, ...result };
  },
});
