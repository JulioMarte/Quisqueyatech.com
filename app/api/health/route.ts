import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness: process is up. Used by Docker/Coolify HEALTHCHECK — always 200 if Next answers. */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "alive",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
