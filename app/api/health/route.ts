import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "missing" | "error"> = {
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ? "ok" : "missing",
    convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ? "ok" : "missing",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ? "ok" : "missing",
  };

  let convexReachable: "ok" | "error" | "skipped" = "skipped";
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (convexUrl) {
    try {
      const response = await fetch(convexUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(4_000),
      });
      // Convex deployment URLs respond; any HTTP response means the edge is up.
      convexReachable = response.status > 0 ? "ok" : "error";
    } catch {
      convexReachable = "error";
    }
  } else {
    convexReachable = "error";
  }

  const production = process.env.NODE_ENV === "production";
  const requiredOk =
    checks.convexUrl === "ok" &&
    checks.siteUrl === "ok" &&
    convexReachable === "ok" &&
    (!production || checks.convexSiteUrl === "ok");

  const body = {
    ok: requiredOk,
    status: requiredOk ? "healthy" : "degraded",
    checks: { ...checks, convexReachable },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: requiredOk ? 200 : 503 });
}
