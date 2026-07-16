import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";

const RESET_CONFIRMATION = "RESET_ADMIN_SETUP";
const MAX_RESET_LEASE_MS = 10 * 60_000;

type DeletePage = {
  count: number;
  isDone: boolean;
  continueCursor: string;
};

function constantTimeEqual(left: string, right: string) {
  const size = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function requireEphemeralResetToken(token: string) {
  const configured = process.env.ADMIN_SETUP_RESET_TOKEN?.trim() ?? "";
  const separator = configured.lastIndexOf(":");
  const expected = separator > 0 ? configured.slice(0, separator) : "";
  const expiresAt = separator > 0 ? Number(configured.slice(separator + 1)) : 0;
  const now = Date.now();
  if (
    expected.length < 32 ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + MAX_RESET_LEASE_MS ||
    !constantTimeEqual(token, expected)
  ) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin setup reset is unavailable" });
  }
}

async function deleteEveryPage(runPage: (cursor: string | null) => Promise<DeletePage>) {
  let cursor: string | null = null;
  let deleted = 0;
  do {
    const page = await runPage(cursor);
    deleted += page.count;
    cursor = page.isDone ? null : page.continueCursor;
  } while (cursor);
  return deleted;
}

/**
 * CLI-only maintenance action. The command installs a short-lived deployment
 * token before invoking it and removes that token afterward. It intentionally
 * wipes every Better Auth human identity because this application supports one
 * administrator and no public registration.
 */
export const resetAdminSetup = action({
  args: { resetToken: v.string(), confirmation: v.string() },
  handler: async (ctx, args) => {
    requireEphemeralResetToken(args.resetToken);
    if (args.confirmation !== RESET_CONFIRMATION) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Invalid reset confirmation" });
    }

    await ctx.runMutation(internal.adminReset.lockAdminSetup, { now: Date.now() });

    const remove = (model: "session" | "account" | "twoFactor" | "oauthAccessToken" | "oauthConsent" | "oauthApplication" | "verification" | "rateLimit" | "user") =>
      deleteEveryPage((cursor) => ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: { model },
        paginationOpts: { numItems: 100, cursor },
      }) as Promise<DeletePage>);

    // Revoke access before removing credentials and the user record.
    const deleted = {
      sessions: await remove("session"),
      accounts: await remove("account"),
      twoFactor: await remove("twoFactor"),
      oauthAccessTokens: await remove("oauthAccessToken"),
      oauthConsents: await remove("oauthConsent"),
      oauthApplications: await remove("oauthApplication"),
      verifications: await remove("verification"),
      rateLimits: await remove("rateLimit"),
      users: await remove("user"),
      recoveryCodes: 0,
      setupRateLimits: 0,
    };

    let applicationPage: { recoveryCodes: number; setupRateLimits: number; isDone: boolean };
    do {
      applicationPage = await ctx.runMutation(internal.adminReset.clearAdminSetupPage, {});
      deleted.recoveryCodes += applicationPage.recoveryCodes;
      deleted.setupRateLimits += applicationPage.setupRateLimits;
    } while (!applicationPage.isDone);

    await ctx.runMutation(internal.adminReset.finishAdminReset, {});
    console.info(JSON.stringify({ scope: "auth", operation: "reset-admin-setup", result: "success", deleted }));
    return { status: "uninitialized" as const, deleted };
  },
});

export const lockAdminSetup = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    const locked = {
      status: "configured" as const,
      claimExpiresAt: undefined,
      adminUserId: undefined,
      adminEmail: undefined,
      adminName: undefined,
      updatedAt: args.now,
    };
    if (row) await ctx.db.patch(row._id, locked);
    else await ctx.db.insert("adminInstallation", { singleton: "admin", ...locked });
    return null;
  },
});

export const clearAdminSetupPage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const recoveryCodes = await ctx.db.query("adminRecoveryCodes").take(100);
    for (const code of recoveryCodes) await ctx.db.delete(code._id);

    const setupRateLimits = await ctx.db
      .query("authSecurityRateLimits")
      .withIndex("by_key", q => q.gte("key", "setup:").lt("key", "setup;"))
      .take(100);
    for (const rate of setupRateLimits) await ctx.db.delete(rate._id);

    return {
      recoveryCodes: recoveryCodes.length,
      setupRateLimits: setupRateLimits.length,
      isDone: recoveryCodes.length < 100 && setupRateLimits.length < 100,
    };
  },
});

export const finishAdminReset = internalMutation({
  args: {},
  handler: async (ctx) => {
    const remainingCode = await ctx.db.query("adminRecoveryCodes").first();
    const remainingSetupLimit = await ctx.db
      .query("authSecurityRateLimits")
      .withIndex("by_key", q => q.gte("key", "setup:").lt("key", "setup;"))
      .first();
    if (remainingCode || remainingSetupLimit) {
      throw new ConvexError({ code: "CONFLICT", message: "Admin reset cleanup is incomplete" });
    }
    const row = await ctx.db.query("adminInstallation").withIndex("by_singleton", q => q.eq("singleton", "admin")).unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});
