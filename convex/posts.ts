import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const adminEmail = "juliomarte@quisqueyatech.com";
const locale = v.union(v.literal("es"), v.literal("en"));
const status = v.union(v.literal("draft"), v.literal("scheduled"), v.literal("published"), v.literal("archived"));

async function requireAdmin(ctx: { auth: { getUserIdentity(): Promise<{ email?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.email?.toLowerCase() !== adminEmail) throw new Error("Unauthorized");
  return identity;
}

function requireServer(secret: string) {
  if (!process.env.ADMIN_API_SECRET || secret !== process.env.ADMIN_API_SECRET) throw new Error("Unauthorized");
}

const postFields = {
  id: v.optional(v.id("posts")), locale, slug: v.string(), translationKey: v.optional(v.string()),
  title: v.string(), excerpt: v.string(), category: v.optional(v.string()), body: v.string(),
  imageId: v.optional(v.id("_storage")), imageAlt: v.optional(v.string()), seoTitle: v.optional(v.string()),
  seoDescription: v.optional(v.string()), readingMinutes: v.optional(v.number()), featured: v.optional(v.boolean()),
  status, publishedAt: v.optional(v.number()),
};

function editable(post: Record<string, unknown>) {
  return {
    locale: post.locale, slug: post.slug, translationKey: post.translationKey, title: post.title,
    excerpt: post.excerpt, category: post.category, body: post.body, imageId: post.imageId,
    imageAlt: post.imageAlt, seoTitle: post.seoTitle, seoDescription: post.seoDescription,
    readingMinutes: post.readingMinutes, featured: post.featured, status: post.status,
    publishedAt: post.publishedAt,
  };
}

async function withImage(ctx: { storage: { getUrl(id: Id<"_storage">): Promise<string | null> } }, post: Record<string, unknown> & { imageId?: Id<"_storage"> }) {
  return { ...post, imageUrl: post.imageId ? await ctx.storage.getUrl(post.imageId) : null };
}

export const published = query({
  args: { locale },
  handler: async (ctx, args) => {
    const posts = await ctx.db.query("posts").withIndex("by_status_published", (q) => q.eq("status", "published")).collect();
    const visible = posts.filter((post) => post.locale === args.locale && (post.publishedAt ?? 0) <= Date.now());
    return Promise.all(visible.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)).map((post) => withImage(ctx, post)));
  },
});

export const publishedBySlug = query({
  args: { locale, slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", args.locale).eq("slug", args.slug)).unique();
    if (!post || post.status !== "published" || (post.publishedAt ?? 0) > Date.now()) return null;
    return withImage(ctx, post);
  },
});

export const adminList = query({ args: {}, handler: async (ctx) => { await requireAdmin(ctx); return ctx.db.query("posts").order("desc").collect(); } });
export const generateUploadUrl = mutation({ args: {}, handler: async (ctx) => { await requireAdmin(ctx); return ctx.storage.generateUploadUrl(); } });

export const serverList = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => { requireServer(args.secret); const posts = await ctx.db.query("posts").order("desc").collect(); return Promise.all(posts.map((post) => withImage(ctx, post))); },
});

export const serverPublished = query({
  args: { secret: v.string(), locale },
  handler: async (ctx, args) => { requireServer(args.secret); const posts = await ctx.db.query("posts").withIndex("by_status_published", (q) => q.eq("status", "published")).collect(); return Promise.all(posts.filter((post) => post.locale === args.locale && (post.publishedAt ?? 0) <= Date.now()).sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)).map((post) => withImage(ctx, post))); },
});

export const serverBySlug = query({
  args: { secret: v.string(), locale, slug: v.string() },
  handler: async (ctx, args) => { requireServer(args.secret); const post = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", args.locale).eq("slug", args.slug)).unique(); return post && post.status === "published" && (post.publishedAt ?? 0) <= Date.now() ? withImage(ctx, post) : null; },
});

export const serverSave = mutation({
  args: { secret: v.string(), ...postFields },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    const { secret: _secret, id, ...input } = args;
    void _secret;
    const duplicate = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", input.locale).eq("slug", input.slug)).unique();
    if (duplicate && duplicate._id !== id) throw new Error("A post already uses this slug and locale");
    const now = Date.now();
    const values = { ...input, readingMinutes: input.readingMinutes ?? Math.max(1, Math.ceil(input.body.trim().split(/\s+/).length / 220)), authorEmail: adminEmail, updatedAt: now };
    if (id) {
      const current = await ctx.db.get(id);
      if (!current) throw new Error("Post not found");
      await ctx.db.insert("postRevisions", { postId: id, snapshot: editable(current as unknown as Record<string, unknown>), reason: "save", actorEmail: adminEmail, createdAt: now });
      await ctx.db.patch(id, values);
      return id;
    }
    return ctx.db.insert("posts", { ...values, createdAt: now });
  },
});

export const serverArchive = mutation({
  args: { secret: v.string(), id: v.id("posts") },
  handler: async (ctx, args) => { requireServer(args.secret); const current = await ctx.db.get(args.id); if (!current) throw new Error("Post not found"); const now = Date.now(); await ctx.db.insert("postRevisions", { postId: args.id, snapshot: editable(current as unknown as Record<string, unknown>), reason: "archive", actorEmail: adminEmail, createdAt: now }); await ctx.db.patch(args.id, { status: "archived", updatedAt: now }); },
});

export const serverRevisions = query({ args: { secret: v.string(), postId: v.id("posts") }, handler: async (ctx, args) => { requireServer(args.secret); return ctx.db.query("postRevisions").withIndex("by_post_created", (q) => q.eq("postId", args.postId)).order("desc").take(30); } });

export const serverRestore = mutation({
  args: { secret: v.string(), revisionId: v.id("postRevisions") },
  handler: async (ctx, args) => { requireServer(args.secret); const revision = await ctx.db.get(args.revisionId); if (!revision) throw new Error("Revision not found"); const current = await ctx.db.get(revision.postId); if (!current) throw new Error("Post not found"); const now = Date.now(); await ctx.db.insert("postRevisions", { postId: revision.postId, snapshot: editable(current as unknown as Record<string, unknown>), reason: "before-restore", actorEmail: adminEmail, createdAt: now }); await ctx.db.patch(revision.postId, { ...revision.snapshot, updatedAt: now }); return revision.postId; },
});

export const serverGenerateUploadUrl = mutation({ args: { secret: v.string() }, handler: async (ctx, args) => { requireServer(args.secret); return ctx.storage.generateUploadUrl(); } });
export const serverRegisterMedia = mutation({ args: { secret: v.string(), storageId: v.id("_storage"), filename: v.string(), contentType: v.string(), purpose: v.string() }, handler: async (ctx, args) => { requireServer(args.secret); return ctx.db.insert("media", { storageId: args.storageId, filename: args.filename, contentType: args.contentType, purpose: args.purpose, ownerEmail: adminEmail, createdAt: Date.now() }); } });
export const serverRecordAiRun = mutation({ args: { secret: v.string(), postId: v.optional(v.id("posts")), action: v.string(), provider: v.string(), model: v.string(), status: v.string(), warnings: v.array(v.string()), inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()), durationMs: v.number() }, handler: async (ctx, args) => { requireServer(args.secret); const { secret: _secret, ...run } = args; void _secret; return ctx.db.insert("aiRuns", { ...run, actorEmail: adminEmail, createdAt: Date.now() }); } });
export const serverIdempotencyGet = query({ args: { secret: v.string(), scope: v.string(), key: v.string() }, handler: async (ctx, args) => { requireServer(args.secret); const record = await ctx.db.query("apiIdempotency").withIndex("by_scope_key", (q) => q.eq("scope", args.scope).eq("key", args.key)).unique(); return record && record.expiresAt > Date.now() ? record.value : null; } });
export const serverIdempotencyPut = mutation({ args: { secret: v.string(), scope: v.string(), key: v.string(), value: v.any() }, handler: async (ctx, args) => { requireServer(args.secret); const existing = await ctx.db.query("apiIdempotency").withIndex("by_scope_key", (q) => q.eq("scope", args.scope).eq("key", args.key)).unique(); if (existing) return existing.value; const now = Date.now(); await ctx.db.insert("apiIdempotency", { scope: args.scope, key: args.key, value: args.value, createdAt: now, expiresAt: now + 24 * 60 * 60 * 1000 }); return args.value; } });

export const serverSeed = mutation({
  args: { secret: v.string(), posts: v.array(v.object({ locale, slug: v.string(), translationKey: v.optional(v.string()), title: v.string(), excerpt: v.string(), category: v.string(), body: v.string(), publishedAt: v.number() })) },
  handler: async (ctx, args) => { requireServer(args.secret); let inserted = 0; for (const post of args.posts) { const exists = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", post.locale).eq("slug", post.slug)).unique(); if (exists) continue; const now = Date.now(); await ctx.db.insert("posts", { ...post, status: "published", authorEmail: adminEmail, readingMinutes: Math.max(1, Math.ceil(post.body.trim().split(/\s+/).length / 220)), createdAt: now, updatedAt: now }); inserted += 1; } return { inserted }; },
});

export const publishDue = internalMutation({
  args: {},
  handler: async (ctx) => { const due = (await ctx.db.query("posts").withIndex("by_status_published", (q) => q.eq("status", "scheduled")).collect()).filter((post) => (post.publishedAt ?? Number.MAX_SAFE_INTEGER) <= Date.now()); for (const post of due) await ctx.db.patch(post._id, { status: "published", updatedAt: Date.now() }); return due.length; },
});
