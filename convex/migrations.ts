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

export const run = migrations.runner();
