import { NextResponse } from "next/server";
import { authorizeContentRequest, adminSecret, requestId } from "@/lib/server/admin-content";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { postInputSchema } from "@/lib/validations/content";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const trace = requestId(request);
  if (!(await authorizeContentRequest(request))) return NextResponse.json({ data: null, error: "Unauthorized", requestId: trace }, { status: 401 });
  const { id } = await context.params;
  const url = new URL(request.url);
  try {
    const data = await convexQuery("posts:serverRevisions", { secret: adminSecret(), postId: id });
    return NextResponse.json({ data: url.searchParams.get("include") === "revisions" ? data || [] : [], error: null, requestId: trace });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not load post", requestId: trace }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const trace = requestId(request);
  const actor = await authorizeContentRequest(request);
  if (!actor) return NextResponse.json({ data: null, error: "Unauthorized", requestId: trace }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  if (body.revisionId) {
    try { const data = await convexMutation("posts:serverRestore", { secret: adminSecret(), revisionId: body.revisionId }); return NextResponse.json({ data: { id: data }, error: null, requestId: trace }); }
    catch (error) { return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not restore revision", requestId: trace }, { status: 503 }); }
  }
  const parsed = postInputSchema.safeParse({ ...body, id });
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message, requestId: trace }, { status: 400 });
  try { const data = await convexMutation("posts:serverSave", { secret: adminSecret(), ...parsed.data, actorType: "admin", actorId: actor.id, actorLabel: actor.label }); return NextResponse.json({ data: { id: data }, error: null, requestId: trace }); }
  catch (error) { const message = error instanceof Error ? error.message : "Could not update post"; return NextResponse.json({ data: null, error: message, requestId: trace }, { status: message.includes("already uses") ? 409 : 503 }); }
}

export async function DELETE(request: Request, context: Context) {
  const trace = requestId(request);
  if (!(await authorizeContentRequest(request))) return NextResponse.json({ data: null, error: "Unauthorized", requestId: trace }, { status: 401 });
  const { id } = await context.params;
  try { await convexMutation("posts:serverArchive", { secret: adminSecret(), id }); return NextResponse.json({ data: { id, status: "archived" }, error: null, requestId: trace }); }
  catch (error) { return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not archive post", requestId: trace }, { status: 503 }); }
}
