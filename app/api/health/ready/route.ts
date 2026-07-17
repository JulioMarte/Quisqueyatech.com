import { NextResponse } from "next/server";
import { resolveConvexSiteUrl, resolveConvexUrl } from "@/lib/server/convex";

export const dynamic = "force-dynamic";

/** Readiness: dependencies configured enough to serve authenticated admin flows. */
export async function GET() {
  const checks: Record<string, "ok" | "missing" | "error"> = {
    convexUrl: resolveConvexUrl() ? "ok" : "missing",
    convexSiteUrl: resolveConvexSiteUrl() ? "ok" : "missing",
    siteUrl:
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() ? "ok" : "missing",
    adminApiSecret: process.env.ADMIN_API_SECRET?.trim() ? "ok" : "missing",
  };

  let convexReachable: "ok" | "error" | "skipped" = "skipped";
  const convexUrl = resolveConvexUrl();
  if (convexUrl) {
    try {
      const response = await fetch(convexUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(4_000),
      });
      convexReachable = response.status > 0 ? "ok" : "error";
    } catch {
      convexReachable = "error";
    }
  } else {
    convexReachable = "error";
  }

  const ready =
    checks.convexUrl === "ok" &&
    checks.siteUrl === "ok" &&
    checks.adminApiSecret === "ok" &&
    convexReachable === "ok";

  return NextResponse.json(
    {
      ok: ready,
      status: ready ? "ready" : "not-ready",
      checks: { ...checks, convexReachable },
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
