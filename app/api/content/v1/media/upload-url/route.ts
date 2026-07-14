import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSecret } from "@/lib/server/auth";
import { contentAgent } from "@/lib/server/content-agent";
import { convexMutation } from "@/lib/server/convex";
const allowed = z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const prepare = z.object({ filename: z.string().min(1).max(180), contentType: allowed, size: z.number().int().positive().max(5_000_000) }).strict();
const register = prepare.extend({ storageId: z.string().min(1) }).strict();
export async function POST(request: Request) { const auth = await contentAgent(request, "upload"); if (auth.response) return auth.response; const body = await request.json().catch(() => null); const registration = register.safeParse(body); if (registration.success) { const id = await convexMutation("posts:serverRegisterMedia", { secret: adminSecret(), storageId: registration.data.storageId, filename: registration.data.filename, contentType: registration.data.contentType, purpose: "post-cover", ownerLabel: auth.actor.actorLabel }); return NextResponse.json({ data: { id } }); } const parsed = prepare.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 }); const uploadUrl = await convexMutation("posts:serverGenerateUploadUrl", { secret: adminSecret() }); return NextResponse.json({ data: { uploadUrl, maxBytes: 5_000_000, acceptedTypes: allowed.options } }); }
