/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SERVICE_SECRET = "assessment-telemetry-test-secret";

beforeEach(() => {
  process.env.ASSESSMENT_STORAGE_SECRET = SERVICE_SECRET;
});

afterEach(() => {
  delete process.env.ASSESSMENT_STORAGE_SECRET;
});

test("telemetry writes are idempotent and contain only bounded technical fields", async () => {
  const t = convexTest(schema, modules);
  const input = {
    serviceSecret: SERVICE_SECRET,
    eventId: "00000000-0000-4000-8000-000000000001",
    assessmentId: "00000000-0000-4000-8000-000000000002",
    supportId: "00000000-0000-4000-8000-000000000003",
    sessionKey: "00000000-0000-4000-8000-000000000004",
    source: "worker" as const,
    event: "turn_stalled",
    turnId: "turn-1",
    state: "thinking",
    code: "model_stalled",
    durationMs: 12_000,
    createdAt: 100,
    expiresAt: 200,
  };
  const first = await t.mutation(api.assessments.recordTelemetry, input);
  const duplicate = await t.mutation(api.assessments.recordTelemetry, input);
  expect(duplicate).toBe(first);
  const rows = await t.run((ctx) => ctx.db.query("assessmentTelemetry").take(10));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ event: "turn_stalled", code: "model_stalled" });
  expect(rows[0]).not.toHaveProperty("transcript");
});

test("session recovery claim reuses the replacement key for the same idempotency key", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("assessmentSessions", {
      sessionKey: "old-session",
      assessmentId: "assessment-1",
      provider: "livekit",
      frameworkVersion: "v1",
      status: "active",
      startedAt: 1,
    }),
  );
  const args = {
    serviceSecret: SERVICE_SECRET,
    assessmentId: "assessment-1",
    sessionKey: "old-session",
    recoveryKey: "recovery-1",
    replacementSessionKey: "new-session",
  };
  expect(await t.mutation(api.assessments.beginSessionRecovery, args)).toEqual({
    claimed: true,
    replacementSessionKey: "new-session",
  });
  expect(
    await t.mutation(api.assessments.beginSessionRecovery, {
      ...args,
      replacementSessionKey: "ignored-session",
    }),
  ).toEqual({ claimed: false, replacementSessionKey: "new-session" });
});
