import test from "node:test";
import assert from "node:assert/strict";
import { classifyAuthError } from "../lib/server/auth-errors";

test("classifyAuthError maps missing ADMIN_API_SECRET", () => {
  const result = classifyAuthError(new Error("ADMIN_API_SECRET is required"));
  assert.equal(result.code, "MISSING_ADMIN_API_SECRET");
  assert.equal(result.status, 503);
});

test("classifyAuthError maps missing Convex URL", () => {
  const result = classifyAuthError(new Error("CONVEX_URL or NEXT_PUBLIC_CONVEX_URL is required"));
  assert.equal(result.code, "MISSING_CONVEX_URL");
});

test("classifyAuthError maps unauthorized machine secret mismatch", () => {
  const result = classifyAuthError(new Error("Unauthorized"));
  assert.equal(result.code, "CONVEX_UNAUTHORIZED");
});
