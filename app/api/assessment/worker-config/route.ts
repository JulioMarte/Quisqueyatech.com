import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runtimeConfig } from "@/lib/server/runtime-config";

export async function GET(request: Request) {
  const expected = process.env.ASSESSMENT_WORKER_SECRET || "";
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || !safeEqual(expected, received)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = await runtimeConfig();
  if (!config.geminiApiKey) {
    return NextResponse.json({ error: "Gemini is not configured" }, { status: 503 });
  }
  return NextResponse.json({
    geminiApiKey: String(config.geminiApiKey),
    model: String(config.geminiLiveModel || "gemini-2.5-flash-native-audio-preview-12-2025"),
    voice: String(config.geminiLiveVoice || "Aoede"),
    temperature: typeof config.geminiLiveTemperature === "number" ? config.geminiLiveTemperature : 0.3,
  }, { headers: { "Cache-Control": "no-store" } });
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
