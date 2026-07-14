import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { adminException, adminFailure, adminJson, authorizeContentRequest, requestId } from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { postInputSchema } from "@/lib/validations/content";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(id, "Unauthorized", 401);
    return adminJson(id, await fetchAuthQuery(api.posts.adminList, {}));
  } catch (error) { return adminException(id, "posts.list", error); }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(id, "Unauthorized", 401);
    const idempotencyKey = request.headers.get("idempotency-key")?.slice(0, 160);
    if (idempotencyKey) { const previous = await fetchAuthQuery(api.posts.adminIdempotencyGet, { scope: "create-post", key: idempotencyKey }); if (previous) return adminJson(id, previous as { id: string }); }
    const parsed = postInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return adminFailure(id, parsed.error.issues[0]?.message || "Invalid request", 400);
    const data = await fetchAuthMutation(api.posts.adminSave, { ...parsed.data, id: parsed.data.id as Id<"posts"> | undefined, imageId: parsed.data.imageId as Id<"_storage"> | undefined });
    const result = { id: data };
    if (idempotencyKey) await fetchAuthMutation(api.posts.adminIdempotencyPut, { scope: "create-post", key: idempotencyKey, value: result });
    return adminJson(id, result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save post";
    return message.includes("already uses") ? adminFailure(id, message, 409) : adminException(id, "posts.create", error);
  }
}
