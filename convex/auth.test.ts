/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
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
    await expect(t.query(api.assessments.adminList, {})).rejects.toThrow();
    await expect(t.query(api.auth.listAgents, {})).rejects.toThrow();
  });

  test("administrative functions reject legacy secret arguments", async () => {
    const t = authTest();
    const listAgents = api.auth.listAgents as unknown as Parameters<typeof t.query>[0];
    await expect(t.query(listAgents, { secret: "legacy-secret" })).rejects.toThrow(/argument|unexpected field|Unauthorized/i);
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
