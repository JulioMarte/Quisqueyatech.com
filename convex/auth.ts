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

function requiredEnvironment(name: "SITE_URL" | "BETTER_AUTH_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new ConvexError({ code: "CONFIGURATION_ERROR", message: `${name} is required` });
  return value;
}

export const authComponent = createClient<DataModel>(components.betterAuth);

function header(context: { headers?: Headers } | null, name: string) {
  return context?.headers?.get(name) ?? "";
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = requiredEnvironment("SITE_URL");
  return betterAuth({
  baseURL: siteUrl,
  secret: requiredEnvironment("BETTER_AUTH_SECRET"),
  trustedOrigins: [siteUrl],
  database: authComponent.adapter(ctx),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 14,
    maxPasswordLength: 128,
  },
  // Human auth endpoints are closed at the catch-all route. The controlled
  // wrappers use the persistent limiter below, avoiding Better Auth OCC hot spots.
  rateLimit: { enabled: false },
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
};

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
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
  const row: Doc<"adminInstallation"> | null = await ctx.runQuery(internal.auth.getInstallation, {});
  if (!row || row.adminUserId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "Administrator access required" });
  return { userId: String(user._id), email: String(user.email), name: String(user.name) };
}

export const getInstallation = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique(),
});

export const currentAdmin = query({
  args: {},
  handler: async (ctx): Promise<{ userId: string; email: string; name: string } | null> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const row = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    if (!row || row.adminUserId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "Administrator access required" });
    return { userId: String(user._id), email: String(user.email), name: String(user.name) };
  },
});

export const recoverAdmin = action({
  args: { serviceSecret: v.string(), codeHash: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    if (args.newPassword.length < 14 || args.newPassword.length > 128) throw new ConvexError("Invalid recovery request");
    const now = Date.now();
    const claimed: { userId: string; claimedAt: number } | null = await ctx.runMutation(internal.auth.claimRecoveryCode, { codeHash: args.codeHash, now });
    if (!claimed) throw new ConvexError("Invalid recovery request");
    try {
      const account = await ctx.runQuery(components.betterAuth.adapter.findOne, { model: "account", where: [{ field: "userId", value: claimed.userId }, { field: "providerId", value: "credential" }] });
      if (!account) throw new ConvexError("Invalid recovery request");
      await ctx.runMutation(components.betterAuth.adapter.updateOne, { input: { model: "account", where: [{ field: "_id", value: account._id }], update: { password: await hashPassword(args.newPassword) } } });
      let cursor: string | null = null;
      do {
        const page: { isDone: boolean; continueCursor: string } = await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
          input: { model: "session", where: [{ field: "userId", value: claimed.userId }] },
          paginationOpts: { numItems: 100, cursor },
        });
        cursor = page.isDone ? null : page.continueCursor;
      } while (cursor);
      await ctx.runMutation(internal.auth.consumeRecoveryCode, { codeHash: args.codeHash, claimedAt: claimed.claimedAt, now: Date.now() });
      return { ok: true };
    } catch (error) {
      await ctx.runMutation(internal.auth.releaseRecoveryCode, { codeHash: args.codeHash, claimedAt: claimed.claimedAt });
      throw error;
    }
  },
});

export const claimRecoveryCode = internalMutation({
  args: { codeHash: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    const code = await ctx.db.query("adminRecoveryCodes").withIndex("by_code_hash", q => q.eq("codeHash", args.codeHash)).unique();
    const installation = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    if (!code || code.consumedAt || (code.claimExpiresAt ?? 0) > args.now || installation?.adminUserId !== code.userId) return null;
    await ctx.db.patch(code._id, { claimedAt: args.now, claimExpiresAt: args.now + 10 * 60_000 });
    return { userId: code.userId, claimedAt: args.now };
  },
});

export const consumeRecoveryCode = internalMutation({ args: { codeHash: v.string(), claimedAt: v.number(), now: v.number() }, handler: async (ctx, args) => { const code = await ctx.db.query("adminRecoveryCodes").withIndex("by_code_hash", q => q.eq("codeHash", args.codeHash)).unique(); if (code?.claimedAt === args.claimedAt && !code.consumedAt) await ctx.db.patch(code._id, { consumedAt: args.now, claimExpiresAt: undefined }); } });
export const releaseRecoveryCode = internalMutation({ args: { codeHash: v.string(), claimedAt: v.number() }, handler: async (ctx, args) => { const code = await ctx.db.query("adminRecoveryCodes").withIndex("by_code_hash", q => q.eq("codeHash", args.codeHash)).unique(); if (code?.claimedAt === args.claimedAt && !code.consumedAt) await ctx.db.patch(code._id, { claimedAt: undefined, claimExpiresAt: undefined }); } });

export const listAgents = query({ args: {}, handler: async (ctx) => { await requireAdmin(ctx); const now = Date.now(); return (await ctx.db.query("contentAgents").order("desc").take(200)).map(agent => ({ _id: agent._id, keyId: agent.keyId, name: agent.name, prefix: agent.prefix, status: agent.status, requestLimit: agent.requestLimit, uploadLimit: agent.uploadLimit, createdBy: agent.createdBy, createdAt: agent.createdAt, rotatedAt: agent.rotatedAt, revokedAt: agent.revokedAt, lastUsedAt: agent.lastUsedAt, pendingRotation: Boolean(agent.pendingTokenHash && (agent.pendingExpiresAt ?? 0) > now), pendingExpiresAt: agent.pendingExpiresAt })); } });
export const createAgent = mutation({ args: { keyId: v.string(), name: v.string(), tokenHash: v.string(), prefix: v.string(), activationId: v.string(), requestLimit: v.number(), uploadLimit: v.number() }, handler: async (ctx, args) => { const admin = await requireAdmin(ctx); const now = Date.now(); return ctx.db.insert("contentAgents", { keyId: args.keyId, name: args.name, tokenHash: `pending:${args.keyId}`, prefix: "pending", status: "pending", requestLimit: args.requestLimit, uploadLimit: args.uploadLimit, createdBy: admin.email, createdAt: now, pendingTokenHash: args.tokenHash, pendingPrefix: args.prefix, pendingActivationId: args.activationId, pendingExpiresAt: now + 30 * 60_000 }); } });
export const revokeAgent = mutation({ args: { keyId: v.string() }, handler: async (ctx, args) => { await requireAdmin(ctx); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); if (!row) return false; await ctx.db.patch(row._id, { status: "revoked", revokedAt: Date.now(), pendingTokenHash: undefined, pendingPrefix: undefined, pendingActivationId: undefined, pendingExpiresAt: undefined }); return true; } });
export const prepareAgentRotation = mutation({ args: { keyId: v.string(), tokenHash: v.string(), prefix: v.string(), activationId: v.string() }, handler: async (ctx, args) => { await requireAdmin(ctx); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); if (!row || row.status !== "active") return false; const now = Date.now(); if (row.pendingTokenHash && (row.pendingExpiresAt ?? 0) > now) throw new ConvexError({ code: "CONFLICT", message: "A credential rotation is already pending" }); await ctx.db.patch(row._id, { pendingTokenHash: args.tokenHash, pendingPrefix: args.prefix, pendingActivationId: args.activationId, pendingExpiresAt: now + 30 * 60_000 }); return true; } });
export const activateAgentCredential = mutation({ args: { keyId: v.string(), activationId: v.string() }, handler: async (ctx, args) => { await requireAdmin(ctx); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); const now = Date.now(); if (!row) return false; if (!row.pendingTokenHash || !row.pendingPrefix || row.pendingActivationId !== args.activationId || (row.pendingExpiresAt ?? 0) <= now) throw new ConvexError({ code: "CONFLICT", message: "Pending credential expired or does not match" }); await ctx.db.patch(row._id, { tokenHash: row.pendingTokenHash, prefix: row.pendingPrefix, status: "active", revokedAt: undefined, rotatedAt: row.status === "active" ? now : undefined, pendingTokenHash: undefined, pendingPrefix: undefined, pendingActivationId: undefined, pendingExpiresAt: undefined }); return true; } });
export const updateAgentLimits = mutation({ args: { keyId: v.string(), requestLimit: v.number(), uploadLimit: v.number() }, handler: async (ctx, args) => { await requireAdmin(ctx); const row = await ctx.db.query("contentAgents").withIndex("by_key_id", q => q.eq("keyId", args.keyId)).unique(); if (!row) return false; if (args.requestLimit < 10 || args.requestLimit > 1000 || args.uploadLimit < 1 || args.uploadLimit > 100) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Invalid limits" }); await ctx.db.patch(row._id, { requestLimit: Math.floor(args.requestLimit), uploadLimit: Math.floor(args.uploadLimit) }); return true; } });
function requireService(secret: string) { const expected = process.env.ADMIN_API_SECRET; if (!expected || secret !== expected) throw new ConvexError("Unauthorized"); }
export const checkSecurityRateLimit = mutation({
  args: { serviceSecret: v.string(), key: v.string(), limit: v.number(), windowMs: v.number() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const now = Date.now();
    if (args.limit < 1 || args.limit > 10_000 || args.windowMs < 1_000 || args.windowMs > 7 * 24 * 60 * 60_000) throw new ConvexError("Invalid rate limit");
    const row = await ctx.db.query("authSecurityRateLimits").withIndex("by_key", q => q.eq("key", args.key)).unique();
    if (!row || row.resetAt <= now) {
      if (row) await ctx.db.patch(row._id, { count: 1, resetAt: now + args.windowMs });
      else await ctx.db.insert("authSecurityRateLimits", { key: args.key, count: 1, resetAt: now + args.windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (row.count >= args.limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((row.resetAt - now) / 1000)) };
    await ctx.db.patch(row._id, { count: row.count + 1 });
    return { allowed: true, retryAfter: 0 };
  },
});
export const authenticateAgent = mutation({
  args: { secret: v.string(), tokenHash: v.string(), operation: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    requireService(args.secret);
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

export const cleanup = internalMutation({ args: {}, handler: async (ctx) => { const now = Date.now(); for (const rate of await ctx.db.query("contentAgentRateLimits").withIndex("by_reset_at", q => q.lte("resetAt", now - 60 * 60_000)).take(100)) await ctx.db.delete(rate._id); for (const rate of await ctx.db.query("authSecurityRateLimits").withIndex("by_reset_at", q => q.lte("resetAt", now - 60 * 60_000)).take(100)) await ctx.db.delete(rate._id); for (const agent of await ctx.db.query("contentAgents").withIndex("by_pending_expiry", q => q.lte("pendingExpiresAt", now)).take(100)) { if (agent.status === "pending") await ctx.db.patch(agent._id, { status: "revoked", revokedAt: now, pendingTokenHash: undefined, pendingPrefix: undefined, pendingActivationId: undefined, pendingExpiresAt: undefined }); else await ctx.db.patch(agent._id, { pendingTokenHash: undefined, pendingPrefix: undefined, pendingActivationId: undefined, pendingExpiresAt: undefined }); } return null; } });
