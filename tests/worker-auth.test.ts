import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedAssessmentWorker, safeEqualSecret } from "../lib/server/worker-auth";

const savedSecret = process.env.ASSESSMENT_WORKER_SECRET;

test("worker auth accepts only the configured bearer secret", () => {
  process.env.ASSESSMENT_WORKER_SECRET = "x".repeat(32);
  const accepted = new Request("https://example.com", {
    headers: { Authorization: `Bearer ${"x".repeat(32)}` },
  });
  const rejected = new Request("https://example.com", {
    headers: { Authorization: `Bearer ${"y".repeat(32)}` },
  });
  assert.equal(isTrustedAssessmentWorker(accepted), true);
  assert.equal(isTrustedAssessmentWorker(rejected), false);
});

test("safeEqualSecret rejects empty or length-mismatched secrets", () => {
  assert.equal(safeEqualSecret("", ""), false);
  assert.equal(safeEqualSecret("abc", "abcd"), false);
  assert.equal(safeEqualSecret("abc", "abc"), true);
});

test.after(() => {
  if (savedSecret === undefined) delete process.env.ASSESSMENT_WORKER_SECRET;
  else process.env.ASSESSMENT_WORKER_SECRET = savedSecret;
});
