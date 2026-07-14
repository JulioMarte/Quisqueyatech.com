import { NextResponse } from "next/server";
import { voiceProviderIds, type VoiceProviderId } from "@/lib/assessment/types";
import { providerConfigured } from "@/lib/server/voice";

export async function GET() {
  const configured = process.env.VOICE_PROVIDER as VoiceProviderId | undefined;
  const provider = configured && voiceProviderIds.includes(configured) ? configured : "ultravox";
  const commonReady = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.ASSESSMENT_STORAGE_SECRET && process.env.ASSESSMENT_TOKEN_SECRET && process.env.TURNSTILE_SECRET_KEY);
  const ready = commonReady && providerConfigured(provider);
  return NextResponse.json({ status: ready ? "ready" : "not-ready", provider }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
