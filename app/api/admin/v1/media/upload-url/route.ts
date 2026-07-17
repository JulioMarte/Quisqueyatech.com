import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation } from "@/lib/server/auth-server";

const registration = z.object({
  storageId: z.string(),
  filename: z.string().min(1).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  purpose: z.literal("post-cover"),
});

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const body = await request.json().catch(() => null);
    if (body?.storageId) {
      const parsed = registration.safeParse(body);
      if (!parsed.success)
        return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid request", 400);
      const id = await fetchAuthMutation(api.posts.adminRegisterMedia, {
        ...parsed.data,
        storageId: parsed.data.storageId as Id<"_storage">,
      });
      return adminJson(trace, { id });
    }
    const uploadUrl = await fetchAuthMutation(api.posts.adminGenerateUploadUrl, {});
    return adminJson(trace, {
      uploadUrl,
      maxBytes: 5_000_000,
      acceptedTypes: registration.shape.contentType.options,
    });
  } catch (error) {
    return adminException(trace, "media.upload", error);
  }
}
