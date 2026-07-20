import assert from "node:assert/strict";
import test from "node:test";
import { shouldFinalizeProviderSession } from "../lib/assessment/finalization";

test("recovery never finalizes an assessment even when shutdown requested completion", () => {
  assert.equal(
    shouldFinalizeProviderSession({
      requested: true,
      sessionStatus: "recovering",
      completionReason: "close",
    }),
    false,
  );
});

test("explicit close finalizes after the client records progress", () => {
  assert.equal(
    shouldFinalizeProviderSession({
      requested: false,
      sessionStatus: "active",
      completionReason: "close",
    }),
    true,
  );
});

test("an unexpected disconnect remains resumable", () => {
  assert.equal(
    shouldFinalizeProviderSession({
      requested: false,
      sessionStatus: "active",
      completionReason: "interruption",
    }),
    false,
  );
});
