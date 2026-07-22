import assert from "node:assert/strict";
import test from "node:test";
import {
  TURNSTILE_TEST_SITE_KEY,
  selectTurnstileCredential,
  turnstilePublicConfig,
  turnstileVerificationConstraints,
} from "../lib/security/turnstile-config";

test("development always selects the official Turnstile test site key", () => {
  assert.deepEqual(turnstilePublicConfig("development", "production-site-key"), {
    mode: "test",
    siteKey: TURNSTILE_TEST_SITE_KEY,
    enabled: true,
  });
});

test("production uses only the configured production site key", () => {
  assert.deepEqual(turnstilePublicConfig("production", " production-site-key "), {
    mode: "production",
    siteKey: "production-site-key",
    enabled: true,
  });
  assert.deepEqual(turnstilePublicConfig("production", undefined), {
    mode: "production",
    siteKey: "",
    enabled: false,
  });
});

test("credential selection cannot leak a production value into development", () => {
  assert.equal(
    selectTurnstileCredential("development", "production-secret", "test-secret"),
    "test-secret",
  );
  assert.equal(
    selectTurnstileCredential("production", " production-secret ", "test-secret"),
    "production-secret",
  );
});

test("hostname and action constraints remain strict only with production responses", () => {
  assert.deepEqual(
    turnstileVerificationConstraints("production", "assessment_start", ["quisqueyatech.com"]),
    {
      expectedAction: "assessment_start",
      allowedHostnames: ["quisqueyatech.com"],
    },
  );
  assert.deepEqual(turnstileVerificationConstraints("test", "assessment_start", ["localhost"]), {});
});
