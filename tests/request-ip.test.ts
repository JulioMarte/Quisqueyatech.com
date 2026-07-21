import assert from "node:assert/strict";
import test from "node:test";
import { trustedRequestIp, validIp } from "../lib/security/request-ip-core";

test("accepts valid IPv4 and IPv6 addresses", () => {
  assert.equal(validIp(" 203.0.113.5 "), "203.0.113.5");
  assert.equal(validIp("2001:db8::1"), "2001:db8::1");
});

test("rejects sentinels and malformed addresses", () => {
  for (const value of [undefined, null, "", "unknown", "untrusted-proxy", "203.0.113.5:443"])
    assert.equal(validIp(value), undefined);
});

test("does not trust forwarding headers unless explicitly enabled", () => {
  const headers = new Headers({ "cf-connecting-ip": "203.0.113.5" });
  assert.equal(trustedRequestIp(headers, false), undefined);
});

test("prioritizes Cloudflare and safely falls back through proxy headers", () => {
  const cloudflare = new Headers({
    "cf-connecting-ip": "2001:db8::1",
    "x-real-ip": "198.51.100.4",
    "x-forwarded-for": "203.0.113.8, 10.0.0.2",
  });
  assert.equal(trustedRequestIp(cloudflare, true), "2001:db8::1");

  const fallback = new Headers({
    "cf-connecting-ip": "attacker-controlled",
    "x-forwarded-for": " 203.0.113.8, 10.0.0.2",
  });
  assert.equal(trustedRequestIp(fallback, true), "203.0.113.8");
});
