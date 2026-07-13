import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeContentRequest, adminSecret, requestId } from "@/lib/server/admin-content";
import { convexMutation } from "@/lib/server/convex";

const registration = z.object({ storageId: z.string(), filename: z.string().min(1).max(180), contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]), purpose: z.literal("post-cover") });

export async function POST(request: Request) {
  const trace = requestId(request);
  if (!(await authorizeContentRequest(request))) return NextResponse.json({ data: null, error: "Unauthorized", requestId: trace }, { status: 401 });
  try {
    const body = await request.json().catch(() => null);
    if (body?.storageId) {
      const parsed = registration.safeParse(body);
      if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message, requestId: trace }, { status: 400 });
      const id = await convexMutation("posts:serverRegisterMedia", { secret: adminSecret(), ...parsed.data });
      return NextResponse.json({ data: { id }, error: null, requestId: trace });
    }
    const uploadUrl = await convexMutation("posts:serverGenerateUploadUrl", { secret: adminSecret() });
    return NextResponse.json({ data: { uploadUrl, maxBytes: 5_000_000, acceptedTypes: registration.shape.contentType.options }, error: null, requestId: trace });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not prepare upload", requestId: trace }, { status: 503 });
  }
}
