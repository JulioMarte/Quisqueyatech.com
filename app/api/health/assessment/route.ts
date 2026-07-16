import { NextResponse } from "next/server";
import { voiceProviderIds, type VoiceProviderId } from "@/lib/assessment/types";
import { providerConfigured } from "@/lib/server/voice";
import { runtimeConfig } from "@/lib/server/runtime-config";

export async function GET() {
  const runtime = await runtimeConfig();
  const configured = runtime.defaultProvider as VoiceProviderId | undefined;
  const provider = configured && voiceProviderIds.includes(configured) ? configured : "ultravox";
  const commonReady = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.ASSESSMENT_STORAGE_SECRET && process.env.ASSESSMENT_TOKEN_SECRET && process.env.TURNSTILE_SECRET_KEY);
  const ready = commonReady && await providerConfigured(provider);
  return NextResponse.json({ status: ready ? "ready" : "not-ready", provider }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
