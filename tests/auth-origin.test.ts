import test from "node:test";
import assert from "node:assert/strict";
import { isValidOrigin } from "../lib/auth-origin";

test("isValidOrigin accepts the local request origin during development", () => {
  assert.equal(
    isValidOrigin({
      origin: "http://localhost:3000",
      requestUrl: "http://localhost:3000/api/auth/login",
      siteUrl: "https://www.quisqueyatech.com",
      nodeEnv: "development",
    }),
    true,
  );
});

test("isValidOrigin treats localhost and loopback IP as equivalent in development", () => {
  assert.equal(
    isValidOrigin({
      origin: "http://127.0.0.1:3000",
      requestUrl: "http://localhost:3000/api/auth/login",
      siteUrl: "https://www.quisqueyatech.com",
      nodeEnv: "development",
    }),
    true,
  );
  assert.equal(
    isValidOrigin({
      origin: "http://127.0.0.1:3001",
      requestUrl: "http://localhost:3000/api/auth/login",
      siteUrl: "https://www.quisqueyatech.com",
      nodeEnv: "development",
    }),
    false,
  );
});

test("isValidOrigin rejects local origins in production when the site URL is public", () => {
  assert.equal(
    isValidOrigin({
      origin: "http://localhost:3000",
      requestUrl: "http://localhost:3000/api/auth/login",
      siteUrl: "https://www.quisqueyatech.com",
      nodeEnv: "production",
    }),
    false,
  );
});
