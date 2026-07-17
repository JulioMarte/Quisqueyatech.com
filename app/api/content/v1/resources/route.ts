import { NextResponse } from "next/server";
import { adminSecret } from "@/lib/server/auth";
import { contentAgent } from "@/lib/server/content-agent";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { agentPostSchema } from "@/lib/validations/content-agent";
export async function GET(request: Request) {
  const auth = await contentAgent(request);
  if (auth.response) return auth.response;
  const url = new URL(request.url),
    status = url.searchParams.get("status") === "review_pending" ? "review_pending" : "draft",
    cursor = url.searchParams.get("cursor"),
    numItems = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 30)));
  const page = (await convexQuery("posts:agentList", {
    secret: adminSecret(),
    status,
    paginationOpts: { cursor, numItems },
  })) as { page: unknown[]; continueCursor: string; isDone: boolean };
  return NextResponse.json({
    data: page.page,
    continueCursor: page.continueCursor,
    isDone: page.isDone,
  });
}
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 150_000)
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const auth = await contentAgent(request, "create");
  if (auth.response) return auth.response;
  const parsed = agentPostSchema
    .omit({ expectedUpdatedAt: true })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const key = request.headers.get("idempotency-key")?.slice(0, 160);
  if (!key) return NextResponse.json({ error: "Idempotency-Key is required" }, { status: 400 });
  const scope = `agent-create:${auth.actor.actorId}`,
    previous = await convexQuery("posts:serverIdempotencyGet", {
      secret: adminSecret(),
      scope,
      key,
    });
  if (previous) return NextResponse.json({ data: previous });
  try {
    const id = await convexMutation("posts:agentSave", {
      secret: adminSecret(),
      ...parsed.data,
      status: "draft",
      ...auth.actor,
    });
    const result = { id };
    await convexMutation("posts:serverIdempotencyPut", {
      secret: adminSecret(),
      scope,
      key,
      value: result,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create resource";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Conflict") ? 409 : 503 },
    );
  }
}
