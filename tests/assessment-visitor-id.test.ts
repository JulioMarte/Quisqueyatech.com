import assert from "node:assert/strict";
import test from "node:test";
import { getAssessmentVisitorId } from "../lib/assessment/visitor-id";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set("quisqueyatech-assessment-visitor", initial);
  return {
    getItem(key: string) {
      return values.get(key) || null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

test("reuses a valid assessment visitor id across retries", () => {
  assert.equal(
    getAssessmentVisitorId(storage(firstId), () => secondId),
    firstId,
  );
});

test("replaces an invalid assessment visitor id", () => {
  assert.equal(
    getAssessmentVisitorId(storage("invalid"), () => secondId),
    secondId,
  );
});

test("still returns an id when browser storage is unavailable", () => {
  const unavailable = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(
    getAssessmentVisitorId(unavailable, () => firstId),
    firstId,
  );
});
