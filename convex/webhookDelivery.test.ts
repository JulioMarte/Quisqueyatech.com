/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function deliveryFixture() {
  const t = convexTest(schema, modules);
  const deliveryId = await t.run((ctx) => ctx.db.insert("webhookDeliveries", {
    eventId: "evt_stable", type: "appointment.confirmed", payload: { eventId: "evt_stable" },
    status: "pending", attempts: 0, nextAttemptAt: 1_000, createdAt: 1_000,
  }));
  return { t, deliveryId };
}

test("claim lease prevents concurrent workers from taking one delivery", async () => {
  const { t, deliveryId } = await deliveryFixture();
  const first = await t.mutation(internal.webhookDelivery.claimDue, { now: 1_000, leaseId: "lease-a" });
  const second = await t.mutation(internal.webhookDelivery.claimDue, { now: 1_000, leaseId: "lease-b" });
  expect(first).toHaveLength(1);
  expect(first[0].item._id).toBe(deliveryId);
  expect(second).toHaveLength(0);
  const attempts = await t.run((ctx) => ctx.db.query("webhookDeliveryAttempts").collect());
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({ eventId: "evt_stable", attempt: 1, manual: false, leaseId: "lease-a" });
});

test("expired leases are recoverable and stale workers cannot finish", async () => {
  const { t, deliveryId } = await deliveryFixture();
  await t.mutation(internal.webhookDelivery.claimDue, { now: 1_000, leaseId: "lease-a" });
  const recovered = await t.mutation(internal.webhookDelivery.claimDue, { now: 61_001, leaseId: "lease-b" });
  expect(recovered).toHaveLength(1);
  expect(await t.mutation(internal.webhookDelivery.finish, { deliveryId, leaseId: "lease-a", attempt: 1, success: true, statusCode: 200, durationMs: 10, now: 61_002 })).toBe(false);
  expect(await t.mutation(internal.webhookDelivery.finish, { deliveryId, leaseId: "lease-b", attempt: 2, success: true, statusCode: 204, durationMs: 12, now: 61_003 })).toBe(true);
  expect(await t.run((ctx) => ctx.db.get(deliveryId))).toMatchObject({ status: "delivered", attempts: 2, lastStatusCode: 204 });
  const history = await t.run((ctx) => ctx.db.query("webhookDeliveryAttempts").withIndex("by_delivery_id_and_attempt", (q) => q.eq("deliveryId", deliveryId).eq("attempt", 1)).unique());
  expect(history).toMatchObject({ success: false, error: "LEASE_EXPIRED", completedAt: 61_001 });
});

test("failed attempts persist sanitized history and prescribed retry delay", async () => {
  const { t, deliveryId } = await deliveryFixture();
  await t.mutation(internal.webhookDelivery.claimDue, { now: 10_000, leaseId: "lease-a" });
  await t.mutation(internal.webhookDelivery.finish, { deliveryId, leaseId: "lease-a", attempt: 1, success: false, error: "NETWORK_ERROR\nsecret", durationMs: 25, now: 11_000 });
  const delivery = await t.run((ctx) => ctx.db.get(deliveryId));
  expect(delivery).toMatchObject({ status: "pending", attempts: 1, nextAttemptAt: 71_000, lastError: "NETWORK_ERROR secret" });
  const history = await t.run((ctx) => ctx.db.query("webhookDeliveryAttempts").first());
  expect(history).toMatchObject({ attempt: 1, success: false, completedAt: 11_000, error: "NETWORK_ERROR secret", durationMs: 25 });
});

test("manual pending delivery preserves attempt count and event id", async () => {
  const { t, deliveryId } = await deliveryFixture();
  await t.run((ctx) => ctx.db.patch(deliveryId, { status: "manual_pending", attempts: 3, nextAttemptAt: 2_000 }));
  const claimed = await t.mutation(internal.webhookDelivery.claimDue, { now: 2_000, leaseId: "lease-manual" });
  expect(claimed[0]).toMatchObject({ attempt: 4, manual: true });
  expect(claimed[0].item.eventId).toBe("evt_stable");
});
