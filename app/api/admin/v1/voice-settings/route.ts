import { NextResponse } from "next/server";
import { authorizeContentRequest, adminSecret } from "@/lib/server/admin-content";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { providerOverrideToken } from "@/lib/server/assessment-tokens";
import { voiceProviderSchema } from "@/lib/validations/assessment";

export async function GET(request: Request) { if (!(await authorizeContentRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ data: { defaultProvider: await convexQuery("assessments:getDefaultProvider", {}) || "ultravox" } }); }
export async function PATCH(request: Request) { const actor = await authorizeContentRequest(request); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = voiceProviderSchema.safeParse((await request.json()).provider); if (!parsed.success) return NextResponse.json({ error: "Invalid provider" }, { status: 400 }); await convexMutation("assessments:adminSetDefaultProvider", { secret: adminSecret(), provider: parsed.data, updatedBy: actor.email, updatedAt: Date.now() }); return NextResponse.json({ data: { defaultProvider: parsed.data } }); }
export async function POST(request: Request) { if (!(await authorizeContentRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = voiceProviderSchema.safeParse((await request.json()).provider); if (!parsed.success) return NextResponse.json({ error: "Invalid provider" }, { status: 400 }); const token = providerOverrideToken(parsed.data); const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin; return NextResponse.json({ data: { url: `${base}/evaluacion/ahora?provider=${encodeURIComponent(token)}` } }); }

