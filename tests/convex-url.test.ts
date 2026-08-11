import assert from "node:assert/strict";
import test from "node:test";
import { resolveConvexSiteUrl, resolveConvexUrl } from "../lib/server/convex-url";

test("development prefers the deployment URLs written to .env.local", () => {
  const previous = snapshot();
  Object.assign(process.env, { NODE_ENV: "development" });
  process.env.CONVEX_URL = "https://stale.convex.cloud";
  process.env.CONVEX_SITE_URL = "https://stale.convex.site";
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://current.convex.cloud";
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL = "https://current.convex.site";
  assert.equal(resolveConvexUrl(), "https://current.convex.cloud");
  assert.equal(resolveConvexSiteUrl(), "https://current.convex.site");
  restore(previous);
});

test("production prefers explicit server runtime URLs", () => {
  const previous = snapshot();
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.CONVEX_URL = "https://runtime.convex.cloud";
  process.env.CONVEX_SITE_URL = "https://runtime.convex.site/";
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://build.convex.cloud";
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL = "https://build.convex.site";
  assert.equal(resolveConvexUrl(), "https://runtime.convex.cloud");
  assert.equal(resolveConvexSiteUrl(), "https://runtime.convex.site");
  restore(previous);
});

function snapshot() {
  return Object.fromEntries(
    ["NODE_ENV", "CONVEX_URL", "CONVEX_SITE_URL", "NEXT_PUBLIC_CONVEX_URL", "NEXT_PUBLIC_CONVEX_SITE_URL"].map(
      (key) => [key, process.env[key]],
    ),
  );
}

function restore(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
