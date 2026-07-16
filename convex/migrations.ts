import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const migrations = new Migrations<DataModel>(components.migrations);

// Widened-schema migration: existing media is permanent only when a post
// actually references its storage object. Everything else receives a grace
// period before retention can remove it.
export const classifyExistingMedia = migrations.define({
  table: "media",
  batchSize: 25,
  migrateOne: async (ctx, media) => {
    if (media.lifecycle) return;
    const post = await ctx.db
      .query("posts")
      .withIndex("by_image_id", (q) => q.eq("imageId", media.storageId))
      .first();
    return post
      ? { lifecycle: "permanent" as const, associatedPostId: post._id, expiresAt: undefined }
      : { lifecycle: "orphaned" as const, expiresAt: Date.now() + 7 * 24 * 60 * 60_000 };
  },
});

// Widened-schema backfill for appointments created before the internal agenda.
// externalId remains untouched as historical Easy!Appointments metadata.
export const normalizeExistingBookings = migrations.define({
  table: "bookings",
  batchSize: 50,
  migrateOne: async (_ctx, booking) => {
    if (booking.end) return;
    const start = Date.parse(booking.start);
    if (!Number.isFinite(start)) return;
    return { end: new Date(start + 15 * 60_000).toISOString() };
  },
});

// Deploy after the widened schema. New writes already populate these fields,
// so the online migration only needs to backfill historical appointments.
export const backfillBookingTimestamps = migrations.define({
  table: "bookings",
  batchSize: 50,
  migrateOne: async (_ctx, booking) => {
    if (booking.startAt !== undefined && booking.endAt !== undefined) return;
    const startAt = Date.parse(booking.start);
    const endAt = booking.end ? Date.parse(booking.end) : startAt + 15 * 60_000;
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
      throw new Error(`Invalid ISO date in booking ${booking.bookingId}`);
    }
    const previousStartAt = booking.previousStart ? Date.parse(booking.previousStart) : undefined;
    if (booking.previousStart && !Number.isFinite(previousStartAt)) throw new Error(`Invalid previousStart in booking ${booking.bookingId}`);
    return { startAt, endAt, previousStartAt };
  },
});

export const run = migrations.runner();
