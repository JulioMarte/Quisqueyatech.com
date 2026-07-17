import { NextResponse } from "next/server";
import { providerConfigured } from "@/lib/server/voice";

export async function GET() {
  const provider = "livekit" as const;
  const commonReady = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.ASSESSMENT_STORAGE_SECRET &&
    process.env.ASSESSMENT_TOKEN_SECRET &&
    process.env.TURNSTILE_SECRET_KEY,
  );
  const ready = commonReady && (await providerConfigured(provider));
  return NextResponse.json(
    { status: ready ? "ready" : "not-ready", provider },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
