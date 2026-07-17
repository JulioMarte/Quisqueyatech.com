import test from "node:test";
import assert from "node:assert/strict";
import { ConvexError } from "convex/values";
import {
  constantTimeEqual,
  requireAdminApiSecret,
  requireAssessmentStorageSecret,
} from "../convex/lib/security";

test("constantTimeEqual rejects different lengths and values", () => {
  assert.equal(constantTimeEqual("abc", "abc"), true);
  assert.equal(constantTimeEqual("abc", "abd"), false);
  assert.equal(constantTimeEqual("abc", "ab"), false);
  assert.equal(constantTimeEqual("", ""), true);
});

test("requireAdminApiSecret fails closed without env and rejects wrong secret", () => {
  const prior = process.env.ADMIN_API_SECRET;
  delete process.env.ADMIN_API_SECRET;
  assert.throws(
    () => requireAdminApiSecret("x"),
    (error: unknown) => error instanceof ConvexError,
  );
  process.env.ADMIN_API_SECRET = "machine-secret-value";
  assert.throws(
    () => requireAdminApiSecret("wrong"),
    (error: unknown) => error instanceof ConvexError,
  );
  assert.doesNotThrow(() => requireAdminApiSecret("machine-secret-value"));
  if (prior === undefined) delete process.env.ADMIN_API_SECRET;
  else process.env.ADMIN_API_SECRET = prior;
});

test("requireAssessmentStorageSecret is independent of admin secret", () => {
  const priorAdmin = process.env.ADMIN_API_SECRET;
  const priorStorage = process.env.ASSESSMENT_STORAGE_SECRET;
  process.env.ADMIN_API_SECRET = "admin-only";
  process.env.ASSESSMENT_STORAGE_SECRET = "storage-only";
  assert.throws(
    () => requireAssessmentStorageSecret("admin-only"),
    (error: unknown) => error instanceof ConvexError,
  );
  assert.doesNotThrow(() => requireAssessmentStorageSecret("storage-only"));
  if (priorAdmin === undefined) delete process.env.ADMIN_API_SECRET;
  else process.env.ADMIN_API_SECRET = priorAdmin;
  if (priorStorage === undefined) delete process.env.ASSESSMENT_STORAGE_SECRET;
  else process.env.ASSESSMENT_STORAGE_SECRET = priorStorage;
});
