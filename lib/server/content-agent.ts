import "server-only";
import { NextResponse } from "next/server";
import { requireContentAgent } from "@/lib/server/auth";
export async function contentAgent(request: Request, operation = "request") {
  const result = await requireContentAgent(request, operation);
  if (result.status === "unauthorized")
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (result.status === "limited")
    return {
      response: NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(Math.max(1, result.retryAfter)) } },
      ),
    };
  return {
    actor: {
      actorType: "agent" as const,
      actorId: result.agent.keyId,
      actorLabel: result.agent.name,
    },
  };
}
