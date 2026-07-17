import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  readAdminJson,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";
import { postInputSchema } from "@/lib/validations/content";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(id, "Unauthorized", 401);
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor"),
      search = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status") as
      "draft" | "review_pending" | "scheduled" | "published" | "archived" | null;
    const locale = url.searchParams.get("locale") as "es" | "en" | null;
    if (search) {
      const items = await fetchAuthQuery(api.posts.adminSearch, {
        search: search.slice(0, 120),
        status: status || undefined,
        locale: locale || undefined,
      });
      return adminJson(id, { items, continueCursor: "", isDone: true });
    }
    const page = await fetchAuthQuery(api.posts.adminList, {
      paginationOpts: {
        cursor,
        numItems: Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 30))),
      },
      status: status || undefined,
      locale: locale || undefined,
    });
    return adminJson(id, {
      items: page.page,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    });
  } catch (error) {
    return adminException(id, "posts.list", error);
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(id, "Unauthorized", 401);
    const idempotencyKey = request.headers.get("idempotency-key")?.slice(0, 160);
    const parsed = postInputSchema.safeParse(await readAdminJson(request, 128_000));
    if (!parsed.success)
      return adminFailure(id, parsed.error.issues[0]?.message || "Invalid request", 400);
    const data = await fetchAuthMutation(api.posts.adminSave, {
      ...parsed.data,
      id: parsed.data.id as Id<"posts"> | undefined,
      imageId: parsed.data.imageId as Id<"_storage"> | undefined,
      idempotencyKey,
    });
    return adminJson(id, data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save post";
    return message.includes("already uses")
      ? adminFailure(id, message, 409)
      : adminException(id, "posts.create", error);
  }
}
