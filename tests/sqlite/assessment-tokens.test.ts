import assert from "node:assert/strict";
import test from "node:test";
import { AssessmentTokenService } from "../../src/server/services/assessment-tokens";

const SECRET = "test-assessment-token-secret-0123456789abcdef";
const ASSESSMENT_ID = "8f2f90f7-6f38-4d40-9e43-5a6c23816adc";

test("assessment capability tokens are purpose-scoped, signed and expire", () => {
  let now = 1_800_000_000_000;
  const tokens = new AssessmentTokenService(SECRET, () => now);

  const progress = tokens.progress(ASSESSMENT_ID);
  const verified = tokens.verify(progress, "progress");
  assert.equal(verified?.assessmentId, ASSESSMENT_ID);
  assert.equal(verified?.purpose, "progress");
  assert.equal(tokens.verify(progress, "resume"), null);

  const [body, signature] = progress.split(".");
  const tamperedBody = Buffer.from(JSON.stringify({
    purpose: "progress",
    assessmentId: "85de5d31-a531-489a-a0cb-85acfa8763ef",
    exp: now + 1_000_000,
    nonce: "attacker",
  })).toString("base64url");
  assert.equal(tokens.verify(`${tamperedBody}.${signature}`, "progress"), null);
  assert.equal(tokens.verify(`${body}.${signature.slice(0, -1)}x`, "progress"), null);

  now += 20 * 60_000 + 1;
  assert.equal(tokens.verify(progress, "progress"), null);
});

test("resume credentials have independent nonces and stable one-way hashes", () => {
  const tokens = new AssessmentTokenService(SECRET, () => 1_800_000_000_000);
  const first = tokens.resume(ASSESSMENT_ID);
  const second = tokens.resume(ASSESSMENT_ID);

  assert.notEqual(first, second);
  assert.notEqual(tokens.hash(first), tokens.hash(second));
  assert.equal(tokens.hash(first), tokens.hash(first));
  assert.equal(tokens.verify(first, "resume")?.assessmentId, ASSESSMENT_ID);
});

test("assessment token service rejects weak signing secrets", () => {
  assert.throws(() => new AssessmentTokenService("too-short"), /at least 32 characters/);
});
