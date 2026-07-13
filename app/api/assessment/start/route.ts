import { NextResponse } from "next/server";
import { assessmentIntakeSchema } from "@/lib/validations/assessment";
import { convexMutation } from "@/lib/server/convex";
import { allowRequest } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { getVoiceProvider } from "@/lib/server/voice";

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!allowRequest(`assessment:${ip}`, 5))
      return NextResponse.json(
        { error: "Too many assessment attempts. Please try again later." },
        { status: 429 },
      );
    const parsed = assessmentIntakeSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Invalid assessment intake",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    if (parsed.data.website)
      return NextResponse.json(
        { error: "Invalid submission" },
        { status: 400 },
      );
    if (!(await verifyTurnstile(parsed.data.turnstileToken, ip)))
      return NextResponse.json(
        { error: "Human verification failed" },
        { status: 403 },
      );
    const assessmentId = crypto.randomUUID();
    const {
      website: _website,
      turnstileToken: _turnstileToken,
      ...intake
    } = parsed.data;
    void _website;
    void _turnstileToken;
    await convexMutation("assessments:create", {
      assessmentId,
      ...intake,
      mode: "now",
      createdAt: Date.now(),
      audioExpiresAt: Date.now() + 30 * 86400000,
      transcriptExpiresAt: Date.now() + 90 * 86400000,
      leadExpiresAt: Date.now() + 365 * 86400000,
    });
    const session = await getVoiceProvider().createSession(
      parsed.data,
      assessmentId,
    );
    await convexMutation("funnel:track", {
      sessionId: assessmentId,
      locale: parsed.data.locale,
      name: "assessment_started",
      assessmentId,
      createdAt: Date.now(),
    });
    return NextResponse.json({
      ...session,
      contactEmail: parsed.data.email,
      locale: parsed.data.locale,
    });
  } catch (error) {
    console.error("[assessment:start]", error);
    return NextResponse.json(
      { error: "The assessment could not be started." },
      { status: 502 },
    );
  }
}
