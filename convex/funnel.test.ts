/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SERVICE_SECRET = "funnel-test-service-secret";

beforeEach(() => {
  process.env.ADMIN_API_SECRET = SERVICE_SECRET;
});

afterEach(() => {
  delete process.env.ADMIN_API_SECRET;
});

test("funnel track rejects public callers and unknown event names", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.funnel.track, {
      serviceSecret: "public",
      sessionId: "s1",
      locale: "es",
      name: "assessment_started",
      createdAt: Date.now(),
    }),
  ).rejects.toThrow(/Unauthorized|UNAUTHORIZED/i);

  await expect(
    t.mutation(api.funnel.track, {
      serviceSecret: SERVICE_SECRET,
      sessionId: "s1",
      locale: "es",
      name: "not_a_real_event",
      createdAt: Date.now(),
    }),
  ).rejects.toThrow(/INVALID_FUNNEL_EVENT/);
});

test("funnel track accepts authorized known events", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.funnel.track, {
    serviceSecret: SERVICE_SECRET,
    sessionId: "session-1",
    locale: "es",
    name: "assessment_started",
    assessmentId: "a1",
    createdAt: Date.now(),
  });
  expect(id).toBeTruthy();
  const row = await t.run((ctx) => ctx.db.get(id));
  expect(row?.name).toBe("assessment_started");
});
