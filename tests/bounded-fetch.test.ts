import assert from "node:assert/strict";
import test from "node:test";
import { fetchBounded, retryableStatus } from "../services/livekit-agent/src/http";

test("retries transient HTTP failures once", async () => {
  let attempts = 0;
  const fetcher = (async () => {
    attempts += 1;
    return new Response(null, { status: attempts === 1 ? 503 : 204 });
  }) as typeof fetch;
  const response = await fetchBounded(
    "https://example.invalid",
    {},
    {
      timeoutMs: 100,
      retries: 1,
      fetcher,
    },
  );
  assert.equal(response.status, 204);
  assert.equal(attempts, 2);
});

test("does not retry permanent client errors", async () => {
  let attempts = 0;
  const fetcher = (async () => {
    attempts += 1;
    return new Response(null, { status: 400 });
  }) as typeof fetch;
  const response = await fetchBounded(
    "https://example.invalid",
    {},
    {
      timeoutMs: 100,
      retries: 1,
      fetcher,
    },
  );
  assert.equal(response.status, 400);
  assert.equal(attempts, 1);
});

test("aborts a hung request at the configured timeout", async () => {
  const fetcher = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    })) as typeof fetch;
  await assert.rejects(
    fetchBounded("https://example.invalid", {}, { timeoutMs: 5, fetcher }),
    (error: Error) => error.name === "AbortError",
  );
});

test("classifies only safe transient statuses as retryable", () => {
  assert.equal(retryableStatus(408), true);
  assert.equal(retryableStatus(429), true);
  assert.equal(retryableStatus(500), true);
  assert.equal(retryableStatus(401), false);
});
