import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { z } from "zod";
import { brand } from "@/lib/brand";

async function authorized() { const { userId } = await auth(); if (!userId) return false; const user = await currentUser(); return user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase() === brand.editorEmail; }
function client() { const url = process.env.NEXT_PUBLIC_CONVEX_URL; if (!url) return null; return new ConvexHttpClient(url); }
const schema = z.object({ _id: z.string().optional(), locale: z.enum(["es", "en"]), slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/), title: z.string().min(4).max(180), excerpt: z.string().min(10).max(320), body: z.string().min(20).max(100000), seoTitle: z.string().max(180).optional(), seoDescription: z.string().max(320).optional(), status: z.enum(["draft", "scheduled", "published"]), publishedAt: z.number().optional() });

export async function GET() { if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const convex = client(); const secret = process.env.ADMIN_API_SECRET; if (!convex || !secret) return NextResponse.json({ posts: [], configured: false }); const ref = makeFunctionReference<"query", { secret: string }, unknown[]>("posts:serverList"); return NextResponse.json({ posts: await convex.query(ref, { secret }), configured: true }); }
export async function POST(request: Request) { if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 }); const convex = client(); const secret = process.env.ADMIN_API_SECRET; if (!convex || !secret) return NextResponse.json({ error: "Convex admin integration is not configured" }, { status: 503 }); const ref = makeFunctionReference<"mutation", Record<string, unknown>, string>("posts:serverSave"); const { _id, ...values } = parsed.data; const id = await convex.mutation(ref, { secret, id: _id, ...values }); return NextResponse.json({ ok: true, id }); }
