import { NextResponse } from "next/server";
import {
  assessmentConferenceStartSchema,
  assessmentIntakeSchema,
  type AssessmentIntake,
} from "@/lib/validations/assessment";
import { convexMutation } from "@/lib/server/convex";
import { allowRequest } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { getVoiceProvider } from "@/lib/server/voice";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!allowRequest(`assessment:${ip}`, 5)) {
      return NextResponse.json(
        { error: "Too many assessment attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const conferenceStart = body?.mode === "conference";
    let intake: AssessmentIntake;
    let turnstileToken: string | undefined;

    if (conferenceStart) {
      const parsed = assessmentConferenceStartSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: parsed.error.issues[0]?.message || "Invalid conference request",
            issues: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }
      const temporaryId = crypto.randomUUID();
      turnstileToken = parsed.data.turnstileToken;
      intake = {
        firstName: parsed.data.locale === "es" ? "Visitante" : "Guest",
        lastName: "Web",
        company: "No informado",
        role: "No informado",
        country: "No informado",
        locale: parsed.data.locale,
        email: `voice-${temporaryId}@anonymous.invalid`,
        phone: "+10000000000",
        processingConsent: true,
        recordingConsent: true,
      };
    } else {
      const parsed = assessmentIntakeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: parsed.error.issues[0]?.message || "Invalid assessment intake",
            issues: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }
      if (parsed.data.website) {
        return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
      }
      turnstileToken = parsed.data.turnstileToken;
      const { website: _website, turnstileToken: _turnstileToken, ...submittedIntake } = parsed.data;
      void _website;
      void _turnstileToken;
      intake = submittedIntake;
    }

    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: "Human verification failed" }, { status: 403 });
    }

    const assessmentId = crypto.randomUUID();
    await convexMutation("assessments:create", {
      assessmentId,
      ...intake,
      mode: "now",
      createdAt: Date.now(),
      audioExpiresAt: Date.now() + 30 * 86400000,
      transcriptExpiresAt: Date.now() + 90 * 86400000,
      leadExpiresAt: Date.now() + 365 * 86400000,
    });
    const session = await getVoiceProvider().createSession(intake, assessmentId);
    await convexMutation("funnel:track", {
      sessionId: assessmentId,
      locale: intake.locale,
      name: "assessment_started",
      assessmentId,
      createdAt: Date.now(),
    });
    return NextResponse.json({
      ...session,
      contactEmail: conferenceStart ? undefined : intake.email,
      locale: intake.locale,
    });
  } catch (error) {
    console.error("[assessment:start]", error);
    return NextResponse.json(
      { error: "The assessment could not be started." },
      { status: 502 },
    );
  }
}
