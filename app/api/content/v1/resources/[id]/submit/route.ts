import { NextResponse } from "next/server";
import { adminSecret } from "@/lib/server/auth";
import { contentAgent } from "@/lib/server/content-agent";
import { convexMutation } from "@/lib/server/convex";
import { transitionSchema } from "@/lib/validations/content-agent";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { const auth = await contentAgent(request, "transition"); if (auth.response) return auth.response; const parsed = transitionSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 }); try { const data = await convexMutation("posts:agentTransition", { secret: adminSecret(), id: (await context.params).id, expectedUpdatedAt: parsed.data.expectedUpdatedAt, action: "submit", ...auth.actor }); return NextResponse.json({ data }); } catch (error) { const message = error instanceof Error ? error.message : "Could not submit"; return NextResponse.json({ error: message }, { status: message.includes("Conflict") ? 409 : message.includes("Not found") ? 404 : 503 }); } }
