import test from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeExternalUrl,
  decryptSetting,
  encryptSetting,
  isForbiddenExternalIp,
  maskLastFour,
  resolveSafeExternalUrl,
  signWebhookBody,
} from "../lib/server/secure-config.ts";

const originalKey = process.env.CONFIG_ENCRYPTION_KEY;
process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

test.after(() => {
  if (originalKey === undefined) delete process.env.CONFIG_ENCRYPTION_KEY;
  else process.env.CONFIG_ENCRYPTION_KEY = originalKey;
});

test("AES-256-GCM uses a unique nonce and detects tampering", () => {
  const first = encryptSetting("secret-value-1234");
  const second = encryptSetting("secret-value-1234");
  assert.notEqual(first, second);
  assert.equal(decryptSetting(first), "secret-value-1234");
  assert.equal(maskLastFour("secret-value-1234"), "1234");
  const pieces = first.split(".");
  pieces[3] = `${pieces[3].slice(0, -1)}${pieces[3].endsWith("A") ? "B" : "A"}`;
  assert.throws(() => decryptSetting(pieces.join(".")));
});

test("HMAC signs the exact body and nothing else", () => {
  const body = '{"eventId":"evt_1","attempt":1}';
  assert.equal(signWebhookBody("test-secret", body), "64884d1d346a406f5c17ff57bd584759b581ac2e64798db499196b0207ba041e");
  assert.notEqual(signWebhookBody("test-secret", `1700000000.${body}`), signWebhookBody("test-secret", body));
});

test("literal private, reserved and mapped addresses are blocked", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "100.64.0.1", "169.254.169.254", "192.168.1.2", "198.51.100.4", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isForbiddenExternalIp(address), true, address);
  }
  assert.equal(isForbiddenExternalIp("8.8.8.8"), false);
  assert.equal(isForbiddenExternalIp("2606:4700:4700::1111"), false);
  assert.throws(() => assertSafeExternalUrl("http://localhost/hook"), /Private destinations/);
  assert.throws(() => assertSafeExternalUrl("https://127.0.0.1/hook"), /Private destinations/);
});

test("DNS validation rejects private and mixed answers", async () => {
  await assert.rejects(
    resolveSafeExternalUrl("https://hooks.example.com/path", async () => [{ address: "10.0.0.2", family: 4 }]),
    /Private destinations/,
  );
  await assert.rejects(
    resolveSafeExternalUrl("https://hooks.example.com/path", async () => [{ address: "8.8.8.8", family: 4 }, { address: "::1", family: 6 }]),
    /Private destinations/,
  );
  const result = await resolveSafeExternalUrl("https://hooks.example.com/path", async () => [{ address: "8.8.8.8", family: 4 }]);
  assert.equal(result.url, "https://hooks.example.com/path");
});
