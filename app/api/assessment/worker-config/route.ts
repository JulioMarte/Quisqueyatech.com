import { NextResponse } from "next/server";
import { validateAssessmentReadiness } from "@/lib/server/assessment-livekit-config";
import { runtimeConfig } from "@/lib/server/runtime-config";
import { defaultGeminiLiveModel, defaultGeminiLiveVoice } from "@/lib/server/voice";
import { isTrustedAssessmentWorker } from "@/lib/server/worker-auth";

export async function GET(request: Request) {
  if (!(await isTrustedAssessmentWorker(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = await runtimeConfig();
  const readiness = validateAssessmentReadiness(config, { includeTurnstile: false });
  const blocking = readiness.issues.find((issue) =>
    [
      "GEMINI_API_KEY_MISSING",
      "GEMINI_LIVE_MODEL_MISSING",
      "ASSESSMENT_WORKER_SECRET_MISSING",
    ].includes(issue.code),
  );
  if (blocking)
    return NextResponse.json(
      { error: blocking.message, code: blocking.code, issues: readiness.issues },
      { status: 503 },
    );
  return NextResponse.json(
    {
      geminiApiKey: String(config.geminiApiKey),
      model: String(config.geminiLiveModel || defaultGeminiLiveModel),
      voice: String(config.geminiLiveVoice || defaultGeminiLiveVoice),
      temperature:
        typeof config.geminiLiveTemperature === "number" ? config.geminiLiveTemperature : 0.3,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
