import { NextResponse } from "next/server";
import { parseClientDiagnostic } from "@/lib/assessment/client-diagnostic";
import { verifyAssessmentToken } from "@/lib/server/assessment-tokens";
import { allowRequest } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const verified = verifyAssessmentToken(token, "progress");
  if (!verified?.assessmentId)
    return NextResponse.json({ error: "Invalid or expired assessment token" }, { status: 401 });

  let payload: ReturnType<typeof parseClientDiagnostic>;
  try {
    payload = parseClientDiagnostic(await request.json());
  } catch {
    payload = null;
  }
  if (!payload) return NextResponse.json({ error: "Invalid diagnostic event" }, { status: 400 });
  if (!payload.roomName.startsWith(`assessment-${verified.assessmentId}-`))
    return NextResponse.json({ error: "Assessment room mismatch" }, { status: 403 });
  if (!(await allowRequest(`assessment-diagnostic:${verified.assessmentId}`, 30, 60 * 60_000)))
    return NextResponse.json({ error: "Diagnostic rate limit exceeded" }, { status: 429 });

  console.info(
    JSON.stringify({
      service: "assessment-client",
      assessmentId: verified.assessmentId,
      ...payload,
    }),
  );
  return new NextResponse(null, { status: 204 });
}
