import test from "node:test";
import assert from "node:assert/strict";
import { requestTurnstileVerification } from "../lib/security/turnstile-core";

test("Turnstile sends the token and IP and accepts a valid response", async () => {
  const fetcher: typeof fetch = async (_input, init) => {
    const body = init?.body as URLSearchParams;
    assert.equal(body.get("secret"), "secret-value");
    assert.equal(body.get("response"), "valid-token");
    assert.equal(body.get("remoteip"), "203.0.113.5");
    return Response.json({ success: true, hostname: "www.quisqueyatech.com" });
  };
  const result = await requestTurnstileVerification(
    "secret-value",
    "valid-token",
    "203.0.113.5",
    fetcher,
  );
  assert.equal(result.success, true);
});

test("Turnstile preserves provider error codes for expired, duplicate, or invalid tokens", async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] });
  const result = await requestTurnstileVerification("secret", "expired-token", undefined, fetcher);
  assert.deepEqual(result, { success: false, "error-codes": ["timeout-or-duplicate"] });
});

test("Turnstile rejects a token that Cloudflare does not accept for the configured hostname", async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({
      success: false,
      hostname: "unauthorized.example",
      "error-codes": ["invalid-input-response"],
    });
  const result = await requestTurnstileVerification(
    "secret",
    "wrong-host-token",
    undefined,
    fetcher,
  );
  assert.equal(result.success, false);
  assert.equal(result.hostname, "unauthorized.example");
  assert.deepEqual(result["error-codes"], ["invalid-input-response"]);
});

test("Turnstile converts upstream HTTP failures into safe diagnostic codes", async () => {
  const fetcher: typeof fetch = async () => new Response(null, { status: 503 });
  const result = await requestTurnstileVerification("secret", "token", "unknown", fetcher);
  assert.deepEqual(result, { success: false, "error-codes": ["http-503"] });
});
