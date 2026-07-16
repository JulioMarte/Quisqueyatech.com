/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import betterAuthSchema from "../node_modules/@convex-dev/better-auth/src/component/schema";

const modules = import.meta.glob("./**/*.ts");
const betterAuthModules = import.meta.glob("../node_modules/@convex-dev/better-auth/src/component/**/*.ts");

function authTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuthSchema, betterAuthModules);
  return t;
}

describe("administrative authorization", () => {
  test("anonymous callers cannot list assessments or content agents", async () => {
    const t = authTest();
    await expect(t.query(api.assessments.adminList, { paginationOpts: { cursor: null, numItems: 10 } })).rejects.toThrow();
    await expect(t.query(api.auth.listAgents, {})).rejects.toThrow();
  });

  test("administrative functions reject legacy secret arguments", async () => {
    const t = authTest();
    const listAgents = api.auth.listAgents as unknown as Parameters<typeof t.query>[0];
    await expect(t.query(listAgents, { secret: "legacy-secret" })).rejects.toThrow(/argument|unexpected field|Unauthorized/i);
  });
});

describe("service and human identity separation", () => {
  test("direct recovery without the machine secret is rejected at the contract", async () => {
    const t = authTest();
    const recover = api.auth.recoverAdmin as unknown as Parameters<typeof t.action>[0];
    await expect(t.action(recover, { codeHash: "a".repeat(64), newPassword: "correct-horse-battery-staple" })).rejects.toThrow(/argument|serviceSecret|missing/i);
  });

  test("deprecated human-auth tables remain empty during current flows", async () => {
    const t = authTest();
    const counts = await t.run(async (ctx) => ({ sessions: (await ctx.db.query("adminSessions").take(1)).length, attempts: (await ctx.db.query("authLoginAttempts").take(1)).length }));
    expect(counts).toEqual({ sessions: 0, attempts: 0 });
  });

  test("persistent auth limiter enforces its window without legacy tables", async () => {
    const t = authTest();
    const prior = process.env.ADMIN_API_SECRET;
    process.env.ADMIN_API_SECRET = "test-machine-secret";
    try {
      const args = { serviceSecret: "test-machine-secret", key: "login:hmac-fingerprint", limit: 2, windowMs: 60_000 };
      await expect(t.mutation(api.auth.checkSecurityRateLimit, args)).resolves.toMatchObject({ allowed: true });
      await expect(t.mutation(api.auth.checkSecurityRateLimit, args)).resolves.toMatchObject({ allowed: true });
      await expect(t.mutation(api.auth.checkSecurityRateLimit, args)).resolves.toMatchObject({ allowed: false });
    } finally {
      if (prior === undefined) delete process.env.ADMIN_API_SECRET; else process.env.ADMIN_API_SECRET = prior;
    }
  });
});

describe("recovery-code lease", () => {
  test("blocks concurrent claims and permits a retry after lease expiry", async () => {
    const t = convexTest(schema, modules);
    const now = 10_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("adminInstallation", { singleton: "admin", status: "configured", adminUserId: "user-1", updatedAt: now });
      await ctx.db.insert("adminRecoveryCodes", { userId: "user-1", codeHash: "a".repeat(64), createdAt: now });
    });

    const first = await t.mutation(internal.auth.claimRecoveryCode, { codeHash: "a".repeat(64), now });
    expect(first).toEqual({ userId: "user-1", claimedAt: now });
    await expect(t.mutation(internal.auth.claimRecoveryCode, { codeHash: "a".repeat(64), now: now + 1 })).resolves.toBeNull();
    await expect(t.mutation(internal.auth.claimRecoveryCode, { codeHash: "a".repeat(64), now: now + 10 * 60_000 + 1 })).resolves.toEqual({ userId: "user-1", claimedAt: now + 10 * 60_000 + 1 });
  });

  test("only the active claimant can release or consume a code", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("adminInstallation", { singleton: "admin", status: "configured", adminUserId: "user-1", updatedAt: 1 });
      await ctx.db.insert("adminRecoveryCodes", { userId: "user-1", codeHash: "b".repeat(64), createdAt: 1 });
    });
    await t.mutation(internal.auth.claimRecoveryCode, { codeHash: "b".repeat(64), now: 100 });
    await t.mutation(internal.auth.releaseRecoveryCode, { codeHash: "b".repeat(64), claimedAt: 99 });
    await expect(t.mutation(internal.auth.claimRecoveryCode, { codeHash: "b".repeat(64), now: 101 })).resolves.toBeNull();
    await t.mutation(internal.auth.consumeRecoveryCode, { codeHash: "b".repeat(64), claimedAt: 100, now: 102 });
    await expect(t.mutation(internal.auth.claimRecoveryCode, { codeHash: "b".repeat(64), now: 10_000_000 })).resolves.toBeNull();
  });
});

describe("admin setup reset", () => {
  test("requires a live deployment-scoped reset token", async () => {
    const t = authTest();
    const previous = process.env.ADMIN_SETUP_RESET_TOKEN;
    process.env.ADMIN_SETUP_RESET_TOKEN = `expected-token-${"x".repeat(32)}:${Date.now() + 60_000}`;
    try {
      await expect(t.action(api.adminReset.resetAdminSetup, {
        resetToken: `wrong-token-${"y".repeat(32)}`,
        confirmation: "RESET_ADMIN_SETUP",
      })).rejects.toThrow(/unavailable|FORBIDDEN/i);
    } finally {
      if (previous === undefined) delete process.env.ADMIN_SETUP_RESET_TOKEN;
      else process.env.ADMIN_SETUP_RESET_TOKEN = previous;
    }
  });

  test("revokes Better Auth identity and returns the installation to uninitialized", async () => {
    const t = authTest();
    const now = Date.now();
    const token = `reset-token-${"z".repeat(32)}`;
    const previous = process.env.ADMIN_SETUP_RESET_TOKEN;
    process.env.ADMIN_SETUP_RESET_TOKEN = `${token}:${now + 60_000}`;
    try {
      const user = await t.mutation(components.betterAuth.adapter.create, {
        input: { model: "user", data: { name: "Admin", email: "admin@example.com", emailVerified: true, createdAt: now, updatedAt: now } },
      });
      await t.mutation(components.betterAuth.adapter.create, {
        input: { model: "account", data: { accountId: String(user._id), providerId: "credential", userId: String(user._id), password: "hash", createdAt: now, updatedAt: now } },
      });
      await t.mutation(components.betterAuth.adapter.create, {
        input: { model: "session", data: { expiresAt: now + 60_000, token: "session-token", createdAt: now, updatedAt: now, userId: String(user._id) } },
      });
      for (let index = 1; index <= 100; index += 1) {
        await t.mutation(components.betterAuth.adapter.create, {
          input: { model: "session", data: { expiresAt: now + 60_000, token: `session-token-${index}`, createdAt: now, updatedAt: now, userId: String(user._id) } },
        });
      }
      await t.run(async (ctx) => {
        await ctx.db.insert("adminInstallation", { singleton: "admin", status: "configured", adminUserId: String(user._id), adminEmail: "admin@example.com", adminName: "Admin", configuredAt: now, updatedAt: now });
        await ctx.db.insert("adminRecoveryCodes", { userId: String(user._id), codeHash: "c".repeat(64), createdAt: now });
        await ctx.db.insert("authSecurityRateLimits", { key: "setup:fingerprint", count: 5, resetAt: now + 60_000 });
        await ctx.db.insert("authSecurityRateLimits", { key: "login:fingerprint", count: 5, resetAt: now + 60_000 });
      });

      await expect(t.action(api.adminReset.resetAdminSetup, { resetToken: token, confirmation: "RESET_ADMIN_SETUP" }))
        .resolves.toMatchObject({ status: "uninitialized", deleted: { users: 1, accounts: 1, sessions: 101, recoveryCodes: 1, setupRateLimits: 1 } });

      await expect(t.query(api.auth.setupStatus, {})).resolves.toEqual({ status: "uninitialized" });
      await expect(t.query(components.betterAuth.adapter.findOne, { model: "user", where: [{ field: "email", value: "admin@example.com" }] })).resolves.toBeNull();
      const remaining = await t.run(async (ctx) => ({
        recovery: await ctx.db.query("adminRecoveryCodes").first(),
        loginLimit: await ctx.db.query("authSecurityRateLimits").withIndex("by_key", q => q.eq("key", "login:fingerprint")).unique(),
      }));
      expect(remaining.recovery).toBeNull();
      expect(remaining.loginLimit).not.toBeNull();
    } finally {
      if (previous === undefined) delete process.env.ADMIN_SETUP_RESET_TOKEN;
      else process.env.ADMIN_SETUP_RESET_TOKEN = previous;
    }
  }, 30_000);
});
