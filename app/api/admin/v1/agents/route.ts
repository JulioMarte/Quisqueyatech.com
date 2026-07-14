import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeContentRequest, requestId } from "@/lib/server/admin-content";
import { tokenHash } from "@/lib/server/auth";
import { convexMutation, convexQuery } from "@/lib/server/convex";
const input = z.object({ name: z.string().trim().min(2).max(80), requestLimit: z.number().int().min(10).max(1000).default(120), uploadLimit: z.number().int().min(1).max(100).default(10) });
function credential(keyId: string) { const raw = `qta_${keyId}_${randomBytes(32).toString("base64url")}`; return { raw, hash: tokenHash(raw), prefix: `${raw.slice(0, 18)}…` }; }
export async function GET(request: Request) { const trace = requestId(request); if (!(await authorizeContentRequest(request))) return NextResponse.json({ error: "Unauthorized", requestId: trace }, { status: 401 }); const data = await convexQuery("auth:listAgents", {}); return NextResponse.json({ data: data || [], error: null, requestId: trace }); }
export async function POST(request: Request) { const trace = requestId(request), admin = await authorizeContentRequest(request); if (!admin) return NextResponse.json({ error: "Unauthorized", requestId: trace }, { status: 401 }); const parsed = input.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message, requestId: trace }, { status: 400 }); const keyId = randomBytes(8).toString("base64url"), key = credential(keyId); await convexMutation("auth:createAgent", { keyId, name: parsed.data.name, tokenHash: key.hash, prefix: key.prefix, requestLimit: parsed.data.requestLimit, uploadLimit: parsed.data.uploadLimit, createdBy: admin.email, now: Date.now() }); return NextResponse.json({ data: { keyId, token: key.raw }, error: null, requestId: trace }, { status: 201 }); }
