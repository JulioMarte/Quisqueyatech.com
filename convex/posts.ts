import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import type { GenericCtx } from "@convex-dev/better-auth";
import { requireAdmin } from "./auth";

function configuredAdminEmail() { return "admin@quisqueyatech.com"; }
const locale = v.union(v.literal("es"), v.literal("en"));
const status = v.union(v.literal("draft"), v.literal("review_pending"), v.literal("scheduled"), v.literal("published"), v.literal("archived"));
const actor = { actorType: v.union(v.literal("admin"), v.literal("agent"), v.literal("system")), actorId: v.string(), actorLabel: v.string() };

async function requireServer(ctx: GenericCtx<DataModel>, secret?: string) {
  void ctx;
  if (process.env.ADMIN_API_SECRET && secret === process.env.ADMIN_API_SECRET) return;
  throw new Error("Unauthorized");
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

function adminLabel(admin: { email: string; name: string }) {
  return admin.name || admin.email;
}

export const published = query({
  args: { locale },
  handler: async (ctx, args) => {
    const posts = await ctx.db.query("posts").withIndex("by_locale_status_and_published", (q) => q.eq("locale", args.locale).eq("status", "published").lte("publishedAt", Date.now())).order("desc").take(100);
    return Promise.all(posts.map((post) => withImage(ctx, post)));
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

export const adminList = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(status), locale: v.optional(locale) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result = args.locale && args.status
      ? await ctx.db.query("posts").withIndex("by_locale_status_and_published", q => q.eq("locale", args.locale!).eq("status", args.status!)).order("desc").paginate(args.paginationOpts)
      : args.locale
        ? await ctx.db.query("posts").withIndex("by_locale_and_updated_at", q => q.eq("locale", args.locale!)).order("desc").paginate(args.paginationOpts)
        : args.status
          ? await ctx.db.query("posts").withIndex("by_status_published", q => q.eq("status", args.status!)).order("desc").paginate(args.paginationOpts)
          : await ctx.db.query("posts").order("desc").paginate(args.paginationOpts);
    return { ...result, page: result.page.map(post => ({ _id: post._id, locale: post.locale, slug: post.slug, translationKey: post.translationKey, title: post.title, excerpt: post.excerpt, status: post.status, publishedAt: post.publishedAt, updatedAt: post.updatedAt, imageAlt: post.imageAlt })) };
  },
});

export const adminSearch = query({ args: { search: v.string(), status: v.optional(status), locale: v.optional(locale) }, handler: async (ctx, args) => { await requireAdmin(ctx); const rows = await ctx.db.query("posts").withSearchIndex("search_title", q => { const search = q.search("title", args.search); if (args.locale && args.status) return search.eq("locale", args.locale).eq("status", args.status); if (args.locale) return search.eq("locale", args.locale); if (args.status) return search.eq("status", args.status); return search; }).take(50); return rows.map(post => ({ _id: post._id, locale: post.locale, slug: post.slug, translationKey: post.translationKey, title: post.title, excerpt: post.excerpt, status: post.status, publishedAt: post.publishedAt, updatedAt: post.updatedAt, imageAlt: post.imageAlt })); } });

export const adminGet = query({ args: { id: v.id("posts") }, handler: async (ctx, args) => { await requireAdmin(ctx); const post = await ctx.db.get(args.id); return post ? withImage(ctx, post) : null; } });

export const adminSave = mutation({
  args: { ...postFields, expectedUpdatedAt: v.optional(v.number()), idempotencyKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const { id, expectedUpdatedAt, idempotencyKey, ...rawInput } = args;
    if (!id && idempotencyKey) { const previous = await ctx.db.query("apiIdempotency").withIndex("by_scope_key", q => q.eq("scope", "create-post").eq("key", idempotencyKey)).unique(); if (previous && previous.expiresAt > Date.now()) return previous.value as { id: Id<"posts">; updatedAt: number }; if (previous) await ctx.db.delete(previous._id); }
    const now = Date.now();
    const input = { ...rawInput, publishedAt: rawInput.status === "published" ? rawInput.publishedAt ?? now : rawInput.publishedAt };
    if ((input.status === "published" || input.status === "scheduled") && input.imageId && !input.imageAlt?.trim()) throw new Error("VALIDATION_ERROR: cover image alt text is required");
    if (input.status === "scheduled" && (!input.publishedAt || input.publishedAt <= now)) throw new Error("VALIDATION_ERROR: scheduled publication must be in the future");
    if (input.status === "published" && input.publishedAt! > now) throw new Error("VALIDATION_ERROR: future publication requires scheduled status");
    const duplicate = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", input.locale).eq("slug", input.slug)).unique();
    if (duplicate && duplicate._id !== id) throw new Error("A post already uses this slug and locale");
    if (input.translationKey) { const translation = await ctx.db.query("posts").withIndex("by_translation_and_locale", q => q.eq("translationKey", input.translationKey).eq("locale", input.locale)).unique(); if (translation && translation._id !== id) throw new Error("CONFLICT: translation already exists for this locale"); }
    const label = adminLabel(admin);
    const values = { ...input, readingMinutes: input.readingMinutes ?? Math.max(1, Math.ceil(input.body.trim().split(/\s+/).length / 220)), authorEmail: admin.email, actorType: "admin" as const, actorId: admin.userId, actorLabel: label, updatedAt: now };
    if (id) {
      const current = await ctx.db.get(id);
      if (!current) throw new Error("Post not found");
      if (expectedUpdatedAt === undefined || current.updatedAt !== expectedUpdatedAt) throw new Error("CONFLICT: stale post revision");
      await ctx.db.insert("postRevisions", { postId: id, snapshot: editable(current as unknown as Record<string, unknown>), reason: "save", actorEmail: admin.email, actorType: "admin", actorId: admin.userId, actorLabel: label, createdAt: now });
      await ctx.db.patch(id, values);
      if (input.imageId) await makeMediaPermanent(ctx, input.imageId, id);
      return { id, updatedAt: now };
    }
    const postId = await ctx.db.insert("posts", { ...values, createdAt: now });
    if (input.imageId) await makeMediaPermanent(ctx, input.imageId, postId);
    const result = { id: postId, updatedAt: now };
    if (idempotencyKey) await ctx.db.insert("apiIdempotency", { scope: "create-post", key: idempotencyKey, value: result, createdAt: now, expiresAt: now + 24 * 60 * 60_000 });
    return result;
  },
});

export const adminArchive = mutation({ args: { id: v.id("posts") }, handler: async (ctx, args) => {
  const admin = await requireAdmin(ctx); const current = await ctx.db.get(args.id); if (!current) throw new Error("Post not found");
  const now = Date.now(), label = adminLabel(admin);
  await ctx.db.insert("postRevisions", { postId: args.id, snapshot: editable(current as unknown as Record<string, unknown>), reason: "archive", actorEmail: admin.email, actorType: "admin", actorId: admin.userId, actorLabel: label, createdAt: now });
  await ctx.db.patch(args.id, { status: "archived", actorType: "admin", actorId: admin.userId, actorLabel: label, updatedAt: now });
} });

export const adminRevisions = query({ args: { postId: v.id("posts") }, handler: async (ctx, args) => { await requireAdmin(ctx); return ctx.db.query("postRevisions").withIndex("by_post_created", (q) => q.eq("postId", args.postId)).order("desc").take(30); } });

export const adminRestore = mutation({ args: { postId: v.id("posts"), revisionId: v.id("postRevisions"), expectedUpdatedAt: v.number() }, handler: async (ctx, args) => {
  const admin = await requireAdmin(ctx); const revision = await ctx.db.get(args.revisionId); if (!revision) throw new Error("Post not found");
  if (revision.postId !== args.postId) throw new Error("VALIDATION_ERROR: revision does not belong to post");
  const current = await ctx.db.get(revision.postId); if (!current) throw new Error("Post not found");
  if (current.updatedAt !== args.expectedUpdatedAt) throw new Error("CONFLICT: stale post revision");
  const now = Date.now(), label = adminLabel(admin);
  await ctx.db.insert("postRevisions", { postId: revision.postId, snapshot: editable(current as unknown as Record<string, unknown>), reason: "before-restore", actorEmail: admin.email, actorType: "admin", actorId: admin.userId, actorLabel: label, createdAt: now });
  await ctx.db.patch(revision.postId, { ...revision.snapshot, actorType: "admin", actorId: admin.userId, actorLabel: label, updatedAt: now });
  return revision.postId;
} });

export const adminGenerateUploadUrl = mutation({ args: {}, handler: async (ctx) => { await requireAdmin(ctx); return ctx.storage.generateUploadUrl(); } });
export const adminRegisterMedia = mutation({ args: { storageId: v.id("_storage"), filename: v.string(), contentType: v.string(), purpose: v.string() }, handler: async (ctx, args) => { const admin = await requireAdmin(ctx); const metadata = await ctx.db.system.get("_storage", args.storageId); const accepted = ["image/jpeg", "image/png", "image/webp", "image/avif"]; if (!metadata || metadata.size > 5_000_000 || !metadata.contentType || metadata.contentType !== args.contentType || !accepted.includes(metadata.contentType)) { if (metadata) await ctx.storage.delete(args.storageId); throw new Error("Invalid media upload"); } const now = Date.now(); return ctx.db.insert("media", { storageId: args.storageId, filename: args.filename, contentType: args.contentType, purpose: args.purpose, ownerEmail: admin.email, lifecycle: "temporary", expiresAt: now + 24 * 60 * 60_000, createdAt: now }); } });
export const adminRecordAiRun = mutation({ args: { postId: v.optional(v.id("posts")), action: v.string(), provider: v.string(), model: v.string(), status: v.string(), warnings: v.array(v.string()), inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()), durationMs: v.number() }, handler: async (ctx, args) => { const admin = await requireAdmin(ctx); return ctx.db.insert("aiRuns", { ...args, actorEmail: admin.email, createdAt: Date.now() }); } });
export const adminIdempotencyGet = query({ args: { scope: v.string(), key: v.string() }, handler: async (ctx, args) => { await requireAdmin(ctx); const record = await ctx.db.query("apiIdempotency").withIndex("by_scope_key", (q) => q.eq("scope", args.scope).eq("key", args.key)).unique(); return record && record.expiresAt > Date.now() ? record.value : null; } });
export const adminIdempotencyPut = mutation({ args: { scope: v.string(), key: v.string(), value: v.any() }, handler: async (ctx, args) => { await requireAdmin(ctx); const existing = await ctx.db.query("apiIdempotency").withIndex("by_scope_key", (q) => q.eq("scope", args.scope).eq("key", args.key)).unique(); const now = Date.now(); if (existing?.expiresAt && existing.expiresAt > now) return existing.value; if (existing) await ctx.db.delete(existing._id); await ctx.db.insert("apiIdempotency", { scope: args.scope, key: args.key, value: args.value, createdAt: now, expiresAt: now + 24 * 60 * 60 * 1000 }); return args.value; } });
export const adminSeed = mutation({ args: { posts: v.array(v.object({ locale, slug: v.string(), translationKey: v.optional(v.string()), title: v.string(), excerpt: v.string(), category: v.string(), body: v.string(), publishedAt: v.number() })) }, handler: async (ctx, args) => { const admin = await requireAdmin(ctx); let inserted = 0; for (const post of args.posts) { const exists = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", post.locale).eq("slug", post.slug)).unique(); if (exists) continue; const now = Date.now(); await ctx.db.insert("posts", { ...post, status: "published", authorEmail: admin.email, actorType: "system", actorId: "seed", actorLabel: "System seed", readingMinutes: Math.max(1, Math.ceil(post.body.trim().split(/\s+/).length / 220)), createdAt: now, updatedAt: now }); inserted += 1; } return { inserted }; } });

export const serverList = query({
  args: { secret: v.optional(v.string()) },
  handler: async (ctx, args) => { await requireServer(ctx, args.secret); const posts = await ctx.db.query("posts").order("desc").collect(); return Promise.all(posts.map((post) => withImage(ctx, post))); },
});

export const serverPublished = query({
  args: { secret: v.optional(v.string()), locale },
  handler: async (ctx, args) => { await requireServer(ctx, args.secret); const posts = await ctx.db.query("posts").withIndex("by_status_published", (q) => q.eq("status", "published")).collect(); return Promise.all(posts.filter((post) => post.locale === args.locale && (post.publishedAt ?? 0) <= Date.now()).sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)).map((post) => withImage(ctx, post))); },
});

export const serverBySlug = query({
  args: { secret: v.optional(v.string()), locale, slug: v.string() },
  handler: async (ctx, args) => { await requireServer(ctx, args.secret); const post = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", args.locale).eq("slug", args.slug)).unique(); return post && post.status === "published" && (post.publishedAt ?? 0) <= Date.now() ? withImage(ctx, post) : null; },
});

export const serverSave = mutation({
  args: { secret: v.optional(v.string()), ...postFields, actorType: v.optional(actor.actorType), actorId: v.optional(v.string()), actorLabel: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireServer(ctx, args.secret);
    const { secret: _secret, id, actorType = "admin", actorId = configuredAdminEmail(), actorLabel = configuredAdminEmail(), ...input } = args;
    void _secret;
    const duplicate = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", input.locale).eq("slug", input.slug)).unique();
    if (duplicate && duplicate._id !== id) throw new Error("A post already uses this slug and locale");
    const now = Date.now();
    const values = { ...input, readingMinutes: input.readingMinutes ?? Math.max(1, Math.ceil(input.body.trim().split(/\s+/).length / 220)), authorEmail: configuredAdminEmail(), actorType, actorId, actorLabel, updatedAt: now };
    if (id) {
      const current = await ctx.db.get(id);
      if (!current) throw new Error("Post not found");
      await ctx.db.insert("postRevisions", { postId: id, snapshot: editable(current as unknown as Record<string, unknown>), reason: "save", actorEmail: actorLabel, actorType, actorId, actorLabel, createdAt: now });
      await ctx.db.patch(id, values);
      return id;
    }
    return ctx.db.insert("posts", { ...values, createdAt: now });
  },
});

export const agentList = query({ args: { secret: v.optional(v.string()), status: v.union(v.literal("draft"), v.literal("review_pending")), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const result = await ctx.db.query("posts").withIndex("by_status_published", q => q.eq("status", args.status)).order("desc").paginate(args.paginationOpts); return { ...result, page: result.page.map(post => ({ _id: post._id, locale: post.locale, slug: post.slug, title: post.title, excerpt: post.excerpt, status: post.status, updatedAt: post.updatedAt, actorLabel: post.actorLabel })) }; } });
export const agentGet = query({ args: { secret: v.optional(v.string()), id: v.id("posts") }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const post = await ctx.db.get(args.id); return post && (post.status === "draft" || post.status === "review_pending") ? post : null; } });
export const agentSave = mutation({
  args: { secret: v.optional(v.string()), ...postFields, expectedUpdatedAt: v.optional(v.number()), ...actor },
  handler: async (ctx, args) => {
    await requireServer(ctx, args.secret); const { secret: _secret, id, expectedUpdatedAt, actorType, actorId, actorLabel, status: _status, publishedAt: _publishedAt, ...input } = args; void _secret; void _status; void _publishedAt;
    if (actorType !== "agent") throw new Error("Forbidden"); const now = Date.now();
    if (id) {
      const current = await ctx.db.get(id); if (!current || current.status !== "draft") throw new Error("Not found");
      if (expectedUpdatedAt !== current.updatedAt) throw new Error("Conflict");
      const duplicate = await ctx.db.query("posts").withIndex("by_locale_slug", q => q.eq("locale", input.locale).eq("slug", input.slug)).unique(); if (duplicate && duplicate._id !== id) throw new Error("Conflict");
      await ctx.db.insert("postRevisions", { postId: id, snapshot: editable(current as unknown as Record<string, unknown>), reason: "agent-save", actorEmail: actorLabel, actorType, actorId, actorLabel, createdAt: now });
      await ctx.db.patch(id, { ...input, status: "draft", publishedAt: undefined, authorEmail: actorLabel, actorType, actorId, actorLabel, readingMinutes: input.readingMinutes ?? Math.max(1, Math.ceil(input.body.trim().split(/\s+/).length / 220)), updatedAt: now }); return id;
    }
    const duplicate = await ctx.db.query("posts").withIndex("by_locale_slug", q => q.eq("locale", input.locale).eq("slug", input.slug)).unique(); if (duplicate) throw new Error("Conflict");
    return ctx.db.insert("posts", { ...input, status: "draft", authorEmail: actorLabel, actorType, actorId, actorLabel, readingMinutes: input.readingMinutes ?? Math.max(1, Math.ceil(input.body.trim().split(/\s+/).length / 220)), createdAt: now, updatedAt: now });
  },
});
export const agentTransition = mutation({ args: { secret: v.optional(v.string()), id: v.id("posts"), expectedUpdatedAt: v.number(), action: v.union(v.literal("submit"), v.literal("reopen")), ...actor }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); if (args.actorType !== "agent") throw new Error("Forbidden"); const post = await ctx.db.get(args.id); if (!post || post.updatedAt !== args.expectedUpdatedAt) throw new Error(post ? "Conflict" : "Not found"); const expected = args.action === "submit" ? "draft" : "review_pending"; if (post.status !== expected) throw new Error("Not found"); const now = Date.now(), next = args.action === "submit" ? "review_pending" : "draft"; await ctx.db.insert("postRevisions", { postId: args.id, snapshot: editable(post as unknown as Record<string, unknown>), reason: `agent-${args.action}`, actorEmail: args.actorLabel, actorType: args.actorType, actorId: args.actorId, actorLabel: args.actorLabel, createdAt: now }); await ctx.db.patch(args.id, { status: next, actorType: args.actorType, actorId: args.actorId, actorLabel: args.actorLabel, updatedAt: now }); return { id: args.id, status: next, updatedAt: now }; } });

export const serverArchive = mutation({
  args: { secret: v.optional(v.string()), id: v.id("posts") },
  handler: async (ctx, args) => { await requireServer(ctx, args.secret); const current = await ctx.db.get(args.id); if (!current) throw new Error("Post not found"); const now = Date.now(), label = configuredAdminEmail(); await ctx.db.insert("postRevisions", { postId: args.id, snapshot: editable(current as unknown as Record<string, unknown>), reason: "archive", actorEmail: label, actorType: "admin", actorId: label, actorLabel: label, createdAt: now }); await ctx.db.patch(args.id, { status: "archived", actorType: "admin", actorId: label, actorLabel: label, updatedAt: now }); },
});

export const serverRevisions = query({ args: { secret: v.optional(v.string()), postId: v.id("posts") }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); return ctx.db.query("postRevisions").withIndex("by_post_created", (q) => q.eq("postId", args.postId)).order("desc").take(30); } });

export const serverRestore = mutation({
  args: { secret: v.optional(v.string()), revisionId: v.id("postRevisions") },
  handler: async (ctx, args) => { await requireServer(ctx, args.secret); const revision = await ctx.db.get(args.revisionId); if (!revision) throw new Error("Post not found"); const current = await ctx.db.get(revision.postId); if (!current) throw new Error("Post not found"); const now = Date.now(), label = configuredAdminEmail(); await ctx.db.insert("postRevisions", { postId: revision.postId, snapshot: editable(current as unknown as Record<string, unknown>), reason: "before-restore", actorEmail: label, actorType: "admin", actorId: label, actorLabel: label, createdAt: now }); await ctx.db.patch(revision.postId, { ...revision.snapshot, actorType: "admin", actorId: label, actorLabel: label, updatedAt: now }); return revision.postId; },
});

export const serverGenerateUploadUrl = mutation({ args: { secret: v.optional(v.string()) }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); return ctx.storage.generateUploadUrl(); } });
export const serverRegisterMedia = mutation({ args: { secret: v.optional(v.string()), storageId: v.id("_storage"), filename: v.string(), contentType: v.string(), purpose: v.string(), ownerLabel: v.optional(v.string()) }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const metadata = await ctx.db.system.get("_storage", args.storageId); const accepted = ["image/jpeg", "image/png", "image/webp", "image/avif"]; if (!metadata || metadata.size > 5_000_000 || !metadata.contentType || metadata.contentType !== args.contentType || !accepted.includes(metadata.contentType)) { if (metadata) await ctx.storage.delete(args.storageId); throw new Error("Invalid media upload"); } return ctx.db.insert("media", { storageId: args.storageId, filename: args.filename, contentType: args.contentType, purpose: args.purpose, ownerEmail: args.ownerLabel || configuredAdminEmail(), createdAt: Date.now() }); } });
export const serverRecordAiRun = mutation({ args: { secret: v.optional(v.string()), postId: v.optional(v.id("posts")), action: v.string(), provider: v.string(), model: v.string(), status: v.string(), warnings: v.array(v.string()), inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()), durationMs: v.number() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const { secret: _secret, ...run } = args; void _secret; return ctx.db.insert("aiRuns", { ...run, actorEmail: configuredAdminEmail(), createdAt: Date.now() }); } });
export const serverIdempotencyGet = query({ args: { secret: v.optional(v.string()), scope: v.string(), key: v.string() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const record = await ctx.db.query("apiIdempotency").withIndex("by_scope_key", (q) => q.eq("scope", args.scope).eq("key", args.key)).unique(); return record && record.expiresAt > Date.now() ? record.value : null; } });
export const serverIdempotencyPut = mutation({ args: { secret: v.optional(v.string()), scope: v.string(), key: v.string(), value: v.any() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const existing = await ctx.db.query("apiIdempotency").withIndex("by_scope_key", (q) => q.eq("scope", args.scope).eq("key", args.key)).unique(); if (existing) return existing.value; const now = Date.now(); await ctx.db.insert("apiIdempotency", { scope: args.scope, key: args.key, value: args.value, createdAt: now, expiresAt: now + 24 * 60 * 60 * 1000 }); return args.value; } });

export const serverSeed = mutation({
  args: { secret: v.optional(v.string()), posts: v.array(v.object({ locale, slug: v.string(), translationKey: v.optional(v.string()), title: v.string(), excerpt: v.string(), category: v.string(), body: v.string(), publishedAt: v.number() })) },
  handler: async (ctx, args) => { await requireServer(ctx, args.secret); let inserted = 0; for (const post of args.posts) { const exists = await ctx.db.query("posts").withIndex("by_locale_slug", (q) => q.eq("locale", post.locale).eq("slug", post.slug)).unique(); if (exists) continue; const now = Date.now(); await ctx.db.insert("posts", { ...post, status: "published", authorEmail: configuredAdminEmail(), actorType: "system", actorId: "seed", actorLabel: "System seed", readingMinutes: Math.max(1, Math.ceil(post.body.trim().split(/\s+/).length / 220)), createdAt: now, updatedAt: now }); inserted += 1; } return { inserted }; },
});

export const publishDue = internalMutation({
  args: {},
  handler: async (ctx) => { const now = Date.now(); const due = await ctx.db.query("posts").withIndex("by_status_published", (q) => q.eq("status", "scheduled").lte("publishedAt", now)).take(100); for (const post of due) await ctx.db.patch(post._id, { status: "published", updatedAt: now }); return due.length; },
});

async function makeMediaPermanent(ctx: MutationCtx, storageId: Id<"_storage">, postId: Id<"posts">) {
  const media = await ctx.db.query("media").withIndex("by_storage_id", q => q.eq("storageId", storageId)).unique();
  if (media) await ctx.db.patch(media._id, { lifecycle: "permanent", associatedPostId: postId, expiresAt: undefined });
}

export const backfillActors = mutation({
  args: { secret: v.optional(v.string()), target: v.union(v.literal("posts"), v.literal("revisions")), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireServer(ctx, args.secret); let updated = 0;
    if (args.target === "posts") { const page = await ctx.db.query("posts").paginate(args.paginationOpts); for (const post of page.page) if (!post.actorType) { await ctx.db.patch(post._id, { actorType: "system", actorId: "historical", actorLabel: "Historical content" }); updated += 1; } return { updated, isDone: page.isDone, continueCursor: page.continueCursor }; }
    const page = await ctx.db.query("postRevisions").paginate(args.paginationOpts); for (const revision of page.page) if (!revision.actorType) { await ctx.db.patch(revision._id, { actorType: "system", actorId: "historical", actorLabel: "Historical revision" }); updated += 1; } return { updated, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
