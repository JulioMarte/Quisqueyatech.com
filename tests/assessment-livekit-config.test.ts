import assert from "node:assert/strict";
import test from "node:test";
import { validateAssessmentReadiness } from "../lib/server/assessment-livekit-config";
import type { RuntimeConfig } from "../lib/server/runtime-config";

const savedEnv = { ...process.env };

function restoreEnv() {
  process.env = { ...savedEnv };
}

function readyEnv() {
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.CONVEX_URL = "https://example.convex.cloud";
  process.env.CONVEX_SITE_URL = "https://example.convex.site";
  process.env.ADMIN_API_SECRET = "a".repeat(32);
  process.env.CONFIG_ENCRYPTION_KEY = "b".repeat(64);
  process.env.ASSESSMENT_TOKEN_SECRET = "c".repeat(32);
  process.env.ASSESSMENT_STORAGE_SECRET = "d".repeat(32);
  process.env.ASSESSMENT_WORKER_SECRET = "e".repeat(32);
  process.env.ASSESSMENT_APP_URL = "https://www.quisqueyatech.com";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
  process.env.TURNSTILE_SECRET_KEY = "secret";
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = "quisqueyatech.com,www.quisqueyatech.com";
  process.env.TRUST_PROXY_HEADERS = "true";
  process.env.LIVEKIT_PROJECT_SUBDOMAIN = "live-translate-r87y5gh3";
}

function readyConfig(): RuntimeConfig {
  return {
    livekitUrl: "wss://live-translate-r87y5gh3.livekit.cloud",
    livekitApiKey: "key",
    livekitApiSecret: "secret",
    geminiApiKey: "gemini",
    geminiLiveModel: "gemini-3.1-flash-live-preview",
  };
}

test("assessment readiness accepts a complete production LiveKit configuration", () => {
  restoreEnv();
  readyEnv();
  const result = validateAssessmentReadiness(readyConfig());
  assert.equal(result.ready, true);
  assert.equal(result.code, "READY");
});

test("assessment readiness reports actionable missing variables", () => {
  restoreEnv();
  readyEnv();
  delete process.env.ASSESSMENT_WORKER_SECRET;
  const result = validateAssessmentReadiness({ ...readyConfig(), geminiApiKey: undefined });
  assert.equal(result.ready, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code).filter((code) => code.includes("MISSING")),
    ["ASSESSMENT_WORKER_SECRET_MISSING", "GEMINI_API_KEY_MISSING"],
  );
});

test("assessment readiness rejects a LiveKit project mismatch", () => {
  restoreEnv();
  readyEnv();
  const result = validateAssessmentReadiness({
    ...readyConfig(),
    livekitUrl: "wss://wrong-project.livekit.cloud",
  });
  assert.equal(result.ready, false);
  assert.equal(result.code, "LIVEKIT_PROJECT_MISMATCH");
});

test("assessment readiness rejects invalid app URLs in production", () => {
  restoreEnv();
  readyEnv();
  process.env.ASSESSMENT_APP_URL = "ftp://example.com";
  const result = validateAssessmentReadiness(readyConfig());
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((issue) => issue.code === "ASSESSMENT_APP_URL_MISSING"));
  assert.ok(result.issues.some((issue) => issue.code === "ASSESSMENT_APP_URL_INVALID"));
});

test.after(restoreEnv);
