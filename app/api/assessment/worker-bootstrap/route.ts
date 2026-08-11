import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assessmentPrompt,
  defaultGeminiLiveModel,
  defaultGeminiLiveVoice,
} from "@/lib/server/voice";
import { convexQuery } from "@/lib/server/convex";
import { runtimeConfig } from "@/lib/server/runtime-config";

const requestSchema = z.object({ assessmentId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  const expected = process.env.ASSESSMENT_WORKER_SECRET || "";
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || !safeEqual(expected, received))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid assessment" }, { status: 400 });

  const [config, stored] = await Promise.all([
    runtimeConfig(),
    convexQuery("assessments:getState", { assessmentId: parsed.data.assessmentId }) as Promise<{
      snapshot?: unknown;
      lead?: { locale?: "es" | "en"; firstName?: string };
    } | null>,
  ]);
  if (!config.geminiApiKey)
    return NextResponse.json({ error: "Gemini is not configured" }, { status: 503 });
  if (!stored) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const locale = stored.lead?.locale || "es";
  const resumeSummary = stored.snapshot ? JSON.stringify(stored.snapshot) : undefined;
  return NextResponse.json(
    {
      geminiApiKey: String(config.geminiApiKey),
      model: String(config.geminiLiveModel || defaultGeminiLiveModel),
      voice: String(config.geminiLiveVoice || defaultGeminiLiveVoice),
      temperature:
        typeof config.geminiLiveTemperature === "number" ? config.geminiLiveTemperature : 0.3,
      locale,
      prompt: assessmentPrompt(
        locale,
        stored.lead?.firstName || (locale === "es" ? "visitante" : "guest"),
        resumeSummary,
      ),
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
