import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { hashPassword } from "better-auth/crypto";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;
export const authComponent = createClient<DataModel>(components.betterAuth);

function header(context: { headers?: Headers } | null, name: string) {
  return context?.headers?.get(name) ?? "";
}

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth({
  baseURL: siteUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [siteUrl],
  database: authComponent.adapter(ctx),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 14,
    maxPasswordLength: 128,
  },
  rateLimit: { enabled: true, window: 60, max: 10, storage: "database" },
  databaseHooks: {
    user: {
      create: {
        before: async (_user, context) => {
          if (!("runMutation" in ctx)) throw new APIError("FORBIDDEN", { message: "Setup unavailable" });
          const result: { ok: boolean } = await ctx.runMutation(internal.auth.claimSetup, {
            code: header(context, "x-admin-setup-code"),
            now: Date.now(),
          });
          if (!result.ok) throw new APIError("FORBIDDEN", { message: "Setup unavailable" });
        },
        after: async (user, context) => {
          if (!("runMutation" in ctx)) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Setup failed" });
          let recoveryHashes: string[] = [];
          try { recoveryHashes = JSON.parse(header(context, "x-admin-recovery-hashes")); } catch { /* rejected below */ }
          await ctx.runMutation(internal.auth.finalizeSetup, {
            userId: user.id,
            email: user.email,
            name: user.name,
            recoveryHashes,
            now: Date.now(),
          });
        },
      },
    },
  },
  plugins: [convex({ authConfig })],
});

function constantTimeEqual(left: string, right: string) {
  const size = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

export const setupStatus = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    if (!row) return { status: "uninitialized" as const };
    if (row.status === "provisioning" && (row.claimExpiresAt ?? 0) <= Date.now()) return { status: "uninitialized" as const };
    return { status: row.status };
  },
});

export const claimSetup = internalMutation({
  args: { code: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const expected = process.env.ADMIN_SETUP_CODE ?? "";
    if (expected.length < 24 || !constantTimeEqual(args.code, expected)) return { ok: false };
    const row = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    if (row?.status === "configured" || (row?.status === "provisioning" && (row.claimExpiresAt ?? 0) > args.now)) return { ok: false };
    const value = { status: "provisioning" as const, claimExpiresAt: args.now + 2 * 60_000, updatedAt: args.now };
    if (row) await ctx.db.patch(row._id, value); else await ctx.db.insert("adminInstallation", { singleton: "admin", ...value });
    return { ok: true };
  },
});

export const finalizeSetup = internalMutation({
  args: { userId: v.string(), email: v.string(), name: v.string(), recoveryHashes: v.array(v.string()), now: v.number() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    if (!row || row.status !== "provisioning" || (row.claimExpiresAt ?? 0) <= args.now || args.recoveryHashes.length !== 8 || args.recoveryHashes.some(value => !/^[a-f0-9]{64}$/.test(value))) throw new ConvexError("Setup claim expired");
    await ctx.db.patch(row._id, { status: "configured", claimExpiresAt: undefined, adminUserId: args.userId, adminEmail: args.email.toLowerCase(), adminName: args.name, configuredAt: args.now, updatedAt: args.now });
    for (const codeHash of args.recoveryHashes) await ctx.db.insert("adminRecoveryCodes", { userId: args.userId, codeHash, createdAt: args.now });
  },
});

export async function requireAdmin(ctx: GenericCtx<DataModel>): Promise<{ userId: string; email: string; name: string }> {
  const user = await authComponent.getAuthUser(ctx);
  const row: Doc<"adminInstallation"> | null = await ctx.runQuery(internal.auth.getInstallation, {});
  if (!row || row.adminUserId !== user._id) throw new ConvexError("Unauthorized");
  return { userId: String(user._id), email: String(user.email), name: String(user.name) };
}

export const getInstallation = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique(),
});

export const currentAdmin = query({
  args: {},
  handler: async (ctx): Promise<{ userId: string; email: string; name: string } | null> => {
    try { return await requireAdmin(ctx); } catch { return null; }
  },
});

export const recoverAdmin = action({
  args: { codeHash: v.string(), newPassword: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    if (args.newPassword.length < 14 || args.newPassword.length > 128) throw new ConvexError("Invalid recovery request");
    const claimed: { userId: string } | null = await ctx.runMutation(internal.auth.claimRecoveryCode, { codeHash: args.codeHash, now: args.now });
    if (!claimed) throw new ConvexError("Invalid recovery request");
    const account = await ctx.runQuery(components.betterAuth.adapter.findOne, { model: "account", where: [{ field: "userId", value: claimed.userId }, { field: "providerId", value: "credential" }] });
    if (!account) throw new ConvexError("Invalid recovery request");
    await ctx.runMutation(components.betterAuth.adapter.updateOne, { input: { model: "account", where: [{ field: "_id", value: account._id }], update: { password: await hashPassword(args.newPassword) } } });
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, { input: { model: "session", where: [{ field: "userId", value: claimed.userId }] }, paginationOpts: { numItems: 100, cursor: null } });
    await ctx.runMutation(internal.auth.consumeRecoveryCode, { codeHash: args.codeHash, now: Date.now() });
    return { ok: true };
  },
});

export const claimRecoveryCode = internalMutation({
  args: { codeHash: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const code = await ctx.db.query("adminRecoveryCodes").withIndex("by_code_hash", q => q.eq("codeHash", args.codeHash)).unique();
    const installation = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    if (!code || code.consumedAt || code.claimedAt || installation?.adminUserId !== code.userId) return null;
    await ctx.db.patch(code._id, { claimedAt: args.now });
    return { userId: code.userId };
  },
});

export const consumeRecoveryCode = internalMutation({ args: { codeHash: v.string(), now: v.number() }, handler: async (ctx, args) => { const code = await ctx.db.query("adminRecoveryCodes").withIndex("by_code_hash", q => q.eq("codeHash", args.codeHash)).unique(); if (code?.claimedAt && !code.consumedAt) await ctx.db.patch(code._id, { consumedAt: args.now }); } });

async function requireServer(ctx: GenericCtx<DataModel>, secret?: string) {
  if (process.env.ADMIN_API_SECRET && secret === process.env.ADMIN_API_SECRET) return;
  await requireAdmin(ctx);
}

export const createSession = mutation({
  args: { secret: v.string(), tokenHash: v.string(), email: v.string(), version: v.string(), now: v.number(), expiresAt: v.number(), previousHash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireServer(ctx, args.secret);
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
    await requireServer(ctx, args.secret);
    const session = await ctx.db.query("adminSessions").withIndex("by_token_hash", q => q.eq("tokenHash", args.tokenHash)).unique();
    return session && !session.revokedAt && session.expiresAt > args.now && session.version === args.version ? { email: session.email, expiresAt: session.expiresAt } : null;
  },
});

export const revokeSession = mutation({ args: { secret: v.string(), tokenHash: v.string(), now: v.number() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const row = await ctx.db.query("adminSessions").withIndex("by_token_hash", q => q.eq("tokenHash", args.tokenHash)).unique(); if (row && !row.revokedAt) await ctx.db.patch(row._id, { revokedAt: args.now }); } });

export const loginStatus = mutation({
  args: { secret: v.string(), key: v.string(), now: v.number(), success: v.boolean() },
  handler: async (ctx, args) => {
    await requireServer(ctx, args.secret);
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

export const checkLogin = query({ args: { secret: v.string(), key: v.string(), now: v.number() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const row = await ctx.db.query("authLoginAttempts").withIndex("by_key", q => q.eq("key", args.key)).unique(); return { blocked: Boolean(row?.blockedUntil && row.blockedUntil > args.now), retryAfter: row?.blockedUntil ? Math.max(0, Math.ceil((row.blockedUntil - args.now) / 1000)) : 0 }; } });

export const listAgents = query({ args: { secret: v.optional(v.string()) }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); return (await ctx.db.query("contentAgents").order("desc").take(500)).map(agent => ({ _id: agent._id, keyId: agent.keyId, name: agent.name, prefix: agent.prefix, status: agent.status, requestLimit: agent.requestLimit, uploadLimit: agent.uploadLimit, createdBy: agent.createdBy, createdAt: agent.createdAt, rotatedAt: agent.rotatedAt, revokedAt: agent.revokedAt, lastUsedAt: agent.lastUsedAt })); } });
export const createAgent = mutation({ args: { secret: v.optional(v.string()), keyId: v.string(), name: v.string(), tokenHash: v.string(), prefix: v.string(), requestLimit: v.number(), uploadLimit: v.number(), createdBy: v.string(), now: v.number() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); return ctx.db.insert("contentAgents", { keyId: args.keyId, name: args.name, tokenHash: args.tokenHash, prefix: args.prefix, status: "active", requestLimit: args.requestLimit, uploadLimit: args.uploadLimit, createdBy: args.createdBy, createdAt: args.now }); } });
export const revokeAgent = mutation({ args: { secret: v.optional(v.string()), keyId: v.string(), now: v.number() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); if (!row) return false; await ctx.db.patch(row._id, { status: "revoked", revokedAt: args.now }); return true; } });
export const rotateAgent = mutation({ args: { secret: v.optional(v.string()), keyId: v.string(), tokenHash: v.string(), prefix: v.string(), now: v.number() }, handler: async (ctx, args) => { await requireServer(ctx, args.secret); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); if (!row) return false; await ctx.db.patch(row._id, { tokenHash: args.tokenHash, prefix: args.prefix, status: "active", revokedAt: undefined, rotatedAt: args.now }); return true; } });
export const authenticateAgent = mutation({
  args: { secret: v.string(), tokenHash: v.string(), operation: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    await requireServer(ctx, args.secret);
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
