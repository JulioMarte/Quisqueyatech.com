import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { adminException, adminFailure, adminJson, authorizeContentRequest, readAdminJson, requestId } from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { postInputSchema } from "@/lib/validations/content";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const { id } = await context.params; const url = new URL(request.url);
    const post = await fetchAuthQuery(api.posts.adminGet, { id: id as Id<"posts"> });
    if (!post) return adminFailure(trace, "Not found", 404);
    const revisions = url.searchParams.get("include") === "revisions" ? await fetchAuthQuery(api.posts.adminRevisions, { postId: id as Id<"posts"> }) : undefined;
    return adminJson(trace, { post, revisions });
  } catch (error) { return adminException(trace, "posts.revisions", error); }
}

export async function PATCH(request: Request, context: Context) {
  const trace = requestId(request);
  try { if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401); const { id } = await context.params; const body = await readAdminJson(request, 128_000) as Record<string, unknown>; if (body?.revisionId) { if (typeof body.expectedUpdatedAt !== "number") return adminFailure(trace, "expectedUpdatedAt is required", 400); const data = await fetchAuthMutation(api.posts.adminRestore, { postId: id as Id<"posts">, revisionId: body.revisionId as Id<"postRevisions">, expectedUpdatedAt: body.expectedUpdatedAt }); return adminJson(trace, { id: data }); } const parsed = postInputSchema.safeParse({ ...body, id }); if (!parsed.success) return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid request", 400); if (parsed.data.expectedUpdatedAt === undefined) return adminFailure(trace, "expectedUpdatedAt is required", 400); const data = await fetchAuthMutation(api.posts.adminSave, { ...parsed.data, id: parsed.data.id as Id<"posts"> | undefined, imageId: parsed.data.imageId as Id<"_storage"> | undefined }); return adminJson(trace, data); }
  catch (error) { const message = error instanceof Error ? error.message : "Could not update post"; return message.includes("already uses") ? adminFailure(trace, message, 409) : adminException(trace, "posts.update", error); }
}

export async function DELETE(request: Request, context: Context) {
  const trace = requestId(request);
  try { if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401); const { id } = await context.params; await fetchAuthMutation(api.posts.adminArchive, { id: id as Id<"posts"> }); return adminJson(trace, { id, status: "archived" }); }
  catch (error) { return adminException(trace, "posts.archive", error); }
}
