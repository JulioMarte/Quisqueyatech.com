import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

function requireServer(secret: string) {
  if (!process.env.ADMIN_API_SECRET || secret !== process.env.ADMIN_API_SECRET) throw new Error("Unauthorized");
}

export const createSession = mutation({
  args: { secret: v.string(), tokenHash: v.string(), email: v.string(), version: v.string(), now: v.number(), expiresAt: v.number(), previousHash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    if (args.previousHash) {
      const previous = await ctx.db.query("adminSessions").withIndex("by_token_hash", q => q.eq("tokenHash", args.previousHash!)).unique();
      if (previous && !previous.revokedAt) await ctx.db.patch(previous._id, { revokedAt: args.now });
    }
    return ctx.db.insert("adminSessions", { tokenHash: args.tokenHash, email: args.email, version: args.version, createdAt: args.now, expiresAt: args.expiresAt, lastSeenAt: args.now });
  },
});

export const verifySession = query({
  args: { secret: v.string(), tokenHash: v.string(), version: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    const session = await ctx.db.query("adminSessions").withIndex("by_token_hash", q => q.eq("tokenHash", args.tokenHash)).unique();
    return session && !session.revokedAt && session.expiresAt > args.now && session.version === args.version ? { email: session.email, expiresAt: session.expiresAt } : null;
  },
});

export const revokeSession = mutation({ args: { secret: v.string(), tokenHash: v.string(), now: v.number() }, handler: async (ctx, args) => { requireServer(args.secret); const row = await ctx.db.query("adminSessions").withIndex("by_token_hash", q => q.eq("tokenHash", args.tokenHash)).unique(); if (row && !row.revokedAt) await ctx.db.patch(row._id, { revokedAt: args.now }); } });

export const loginStatus = mutation({
  args: { secret: v.string(), key: v.string(), now: v.number(), success: v.boolean() },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    const row = await ctx.db.query("authLoginAttempts").withIndex("by_key", q => q.eq("key", args.key)).unique();
    if (args.success) { if (row) await ctx.db.delete(row._id); return { blocked: false, retryAfter: 0 }; }
    const fresh = !row || args.now - row.windowStartedAt > 15 * 60_000;
    const count = fresh ? 1 : row.count + 1;
    const blockedUntil = count >= 5 ? args.now + Math.min(30 * 60_000, 30_000 * 2 ** Math.min(count - 5, 6)) : undefined;
    if (row) await ctx.db.patch(row._id, { count, windowStartedAt: fresh ? args.now : row.windowStartedAt, blockedUntil, updatedAt: args.now });
    else await ctx.db.insert("authLoginAttempts", { key: args.key, count, windowStartedAt: args.now, blockedUntil, updatedAt: args.now });
    return { blocked: Boolean(blockedUntil && blockedUntil > args.now), retryAfter: blockedUntil ? Math.ceil((blockedUntil - args.now) / 1000) : 0 };
  },
});

export const checkLogin = query({ args: { secret: v.string(), key: v.string(), now: v.number() }, handler: async (ctx, args) => { requireServer(args.secret); const row = await ctx.db.query("authLoginAttempts").withIndex("by_key", q => q.eq("key", args.key)).unique(); return { blocked: Boolean(row?.blockedUntil && row.blockedUntil > args.now), retryAfter: row?.blockedUntil ? Math.max(0, Math.ceil((row.blockedUntil - args.now) / 1000)) : 0 }; } });

export const listAgents = query({ args: { secret: v.string() }, handler: async (ctx, args) => { requireServer(args.secret); return (await ctx.db.query("contentAgents").order("desc").take(500)).map(agent => ({ _id: agent._id, keyId: agent.keyId, name: agent.name, prefix: agent.prefix, status: agent.status, requestLimit: agent.requestLimit, uploadLimit: agent.uploadLimit, createdBy: agent.createdBy, createdAt: agent.createdAt, rotatedAt: agent.rotatedAt, revokedAt: agent.revokedAt, lastUsedAt: agent.lastUsedAt })); } });
export const createAgent = mutation({ args: { secret: v.string(), keyId: v.string(), name: v.string(), tokenHash: v.string(), prefix: v.string(), requestLimit: v.number(), uploadLimit: v.number(), createdBy: v.string(), now: v.number() }, handler: async (ctx, args) => { requireServer(args.secret); return ctx.db.insert("contentAgents", { keyId: args.keyId, name: args.name, tokenHash: args.tokenHash, prefix: args.prefix, status: "active", requestLimit: args.requestLimit, uploadLimit: args.uploadLimit, createdBy: args.createdBy, createdAt: args.now }); } });
export const revokeAgent = mutation({ args: { secret: v.string(), keyId: v.string(), now: v.number() }, handler: async (ctx, args) => { requireServer(args.secret); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); if (!row) return false; await ctx.db.patch(row._id, { status: "revoked", revokedAt: args.now }); return true; } });
export const rotateAgent = mutation({ args: { secret: v.string(), keyId: v.string(), tokenHash: v.string(), prefix: v.string(), now: v.number() }, handler: async (ctx, args) => { requireServer(args.secret); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); if (!row) return false; await ctx.db.patch(row._id, { tokenHash: args.tokenHash, prefix: args.prefix, status: "active", revokedAt: undefined, rotatedAt: args.now }); return true; } });
export const authenticateAgent = mutation({
  args: { secret: v.string(), tokenHash: v.string(), operation: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    requireServer(args.secret);
    const agent = await ctx.db.query("contentAgents").withIndex("by_token_hash", q => q.eq("tokenHash", args.tokenHash)).unique();
    if (!agent || agent.status !== "active") return { status: "unauthorized" as const };
    const window = Math.floor(args.now / 3_600_000); const rateKey = `${agent.keyId}:${args.operation}:${window}`;
    const rate = await ctx.db.query("contentAgentRateLimits").withIndex("by_key", q => q.eq("key", rateKey)).unique();
    const limit = args.operation === "upload" ? agent.uploadLimit : agent.requestLimit;
    if (rate && rate.count >= limit) return { status: "limited" as const, retryAfter: Math.ceil((rate.resetAt - args.now) / 1000) };
    if (rate) await ctx.db.patch(rate._id, { count: rate.count + 1 }); else await ctx.db.insert("contentAgentRateLimits", { key: rateKey, count: 1, resetAt: (window + 1) * 3_600_000 });
    if (!agent.lastUsedAt || args.now - agent.lastUsedAt > 15 * 60_000) await ctx.db.patch(agent._id, { lastUsedAt: args.now });
    return { status: "ok" as const, agent: { keyId: agent.keyId, name: agent.name } };
  },
});

export const cleanup = internalMutation({ args: {}, handler: async (ctx) => { const now = Date.now(); for (const session of await ctx.db.query("adminSessions").withIndex("by_expiry", q => q.lte("expiresAt", now)).take(100)) await ctx.db.delete(session._id); for (const attempt of await ctx.db.query("authLoginAttempts").withIndex("by_updated_at", q => q.lte("updatedAt", now - 24 * 60 * 60_000)).take(100)) await ctx.db.delete(attempt._id); for (const rate of await ctx.db.query("contentAgentRateLimits").withIndex("by_reset_at", q => q.lte("resetAt", now - 60 * 60_000)).take(100)) await ctx.db.delete(rate._id); return null; } });
