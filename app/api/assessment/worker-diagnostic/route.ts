import { NextResponse } from "next/server";
import { z } from "zod";
import { assessmentTelemetryEvents, telemetryRetentionMs } from "@/lib/assessment/telemetry";
import { convexMutation } from "@/lib/server/convex";

const schema = z
  .object({
    eventId: z.string().uuid(),
    assessmentId: z.string().uuid(),
    supportId: z.string().uuid(),
    sessionKey: z.string().uuid(),
    event: z.enum(assessmentTelemetryEvents),
    turnId: z.string().max(80).optional(),
    state: z.string().max(80).optional(),
    code: z.string().max(80).optional(),
    durationMs: z.number().int().min(0).max(120_000).optional(),
    recoverable: z.boolean().optional(),
  })
  .strict();

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/, "") || "";
  if (!process.env.ASSESSMENT_WORKER_SECRET || token !== process.env.ASSESSMENT_WORKER_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid telemetry event" }, { status: 400 });
  const createdAt = Date.now();
  await convexMutation("assessments:recordTelemetry", {
    ...parsed.data,
    source: "worker",
    createdAt,
    expiresAt: createdAt + telemetryRetentionMs,
  });
  return new NextResponse(null, { status: 204 });
}
