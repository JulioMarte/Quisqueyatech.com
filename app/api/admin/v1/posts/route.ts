import { NextResponse } from "next/server";
import { authorizeContentRequest, requestId } from "@/lib/server/admin-content";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { postInputSchema } from "@/lib/validations/content";

export async function GET(request: Request) {
  const id = requestId(request);
  if (!(await authorizeContentRequest(request))) return NextResponse.json({ data: null, error: "Unauthorized", requestId: id }, { status: 401 });
  try {
    const data = await convexQuery("posts:serverList", {});
    return NextResponse.json({ data: data || [], error: null, requestId: id });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not load posts", requestId: id }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  const actor = await authorizeContentRequest(request);
  if (!actor) return NextResponse.json({ data: null, error: "Unauthorized", requestId: id }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key")?.slice(0, 160);
  if (idempotencyKey) {
    const previous = await convexQuery("posts:serverIdempotencyGet", { scope: "create-post", key: idempotencyKey });
    if (previous) return NextResponse.json({ data: previous, error: null, requestId: id });
  }
  const parsed = postInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message, requestId: id }, { status: 400 });
  try {
    const data = await convexMutation("posts:serverSave", { ...parsed.data, actorType: "admin", actorId: actor.id, actorLabel: actor.label });
    const result = { id: data };
    if (idempotencyKey) await convexMutation("posts:serverIdempotencyPut", { scope: "create-post", key: idempotencyKey, value: result });
    return NextResponse.json({ data: result, error: null, requestId: id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save post";
    return NextResponse.json({ data: null, error: message, requestId: id }, { status: message.includes("already uses") ? 409 : 503 });
  }
}
