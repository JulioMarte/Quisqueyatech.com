import assert from "node:assert/strict";
import test from "node:test";
import { describeClient, parseClientDiagnostic } from "../lib/assessment/client-diagnostic";

const valid = {
  supportId: "00000000-0000-4000-8000-000000000001",
  event: "audio_playing",
  roomName: "assessment-00000000-0000-4000-8000-000000000002-00000000-0000-4000-8000-000000000003",
  playbackState: "playing",
  client: "Firefox / Android",
};

test("accepts a bounded audio diagnostic payload", () => {
  assert.deepEqual(parseClientDiagnostic(valid), valid);
});

test("rejects unknown events, invalid support IDs, and oversized client strings", () => {
  assert.equal(parseClientDiagnostic({ ...valid, event: "transcript" }), null);
  assert.equal(parseClientDiagnostic({ ...valid, supportId: "support-1" }), null);
  assert.equal(parseClientDiagnostic({ ...valid, client: "x".repeat(181) }), null);
});

test("reduces user agents to coarse browser and platform labels", () => {
  assert.equal(
    describeClient("Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko Firefox/128.0"),
    "Firefox / Android",
  );
  assert.equal(
    describeClient("Mozilla/5.0 (Windows NT 10.0) Chrome/126.0 Safari/537.36"),
    "Chrome / Windows",
  );
});
