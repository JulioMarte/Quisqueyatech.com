import assert from "node:assert/strict";
import test from "node:test";
import { fetchMachineRuntime } from "../lib/server/machine-runtime-core";

test("machine runtime authenticates and accepts a valid envelope", async () => {
  let authorization = "";
  const result = await fetchMachineRuntime<{ livekitUrl: string }>("https://example.test/runtime", "secret", {
    retries: 0,
    fetcher: async (_url, init) => {
      authorization = new Headers(init?.headers).get("authorization") || "";
      return Response.json({ source: "convex-env", config: { livekitUrl: "wss://live.test" } });
    },
  });
  assert.equal(authorization, "Bearer secret");
  assert.equal(result.config.livekitUrl, "wss://live.test");
});

test("machine runtime retries once and rejects invalid bodies", async () => {
  let attempts = 0;
  await assert.rejects(
    fetchMachineRuntime("https://example.test/runtime", "secret", {
      retries: 1,
      fetcher: async () => {
        attempts += 1;
        return Response.json({ config: {} });
      },
    }),
    /invalid body/,
  );
  assert.equal(attempts, 2);
});

test("machine runtime fails closed on unauthorized responses", async () => {
  await assert.rejects(
    fetchMachineRuntime("https://example.test/runtime", "wrong", {
      retries: 0,
      fetcher: async () => new Response("Unauthorized", { status: 401 }),
    }),
    /\(401\)/,
  );
});
