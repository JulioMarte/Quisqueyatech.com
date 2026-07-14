import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeContentRequest, adminSecret, requestId } from "@/lib/server/admin-content";
import { tokenHash } from "@/lib/server/auth";
import { convexMutation } from "@/lib/server/convex";
type Context = { params: Promise<{ keyId: string }> };
export async function DELETE(request: Request, context: Context) { const trace = requestId(request); if (!(await authorizeContentRequest(request))) return NextResponse.json({ error: "Unauthorized", requestId: trace }, { status: 401 }); const { keyId } = await context.params; const found = await convexMutation("auth:revokeAgent", { secret: adminSecret(), keyId, now: Date.now() }); return found ? NextResponse.json({ data: { revoked: true } }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
export async function POST(request: Request, context: Context) { const trace = requestId(request); if (!(await authorizeContentRequest(request))) return NextResponse.json({ error: "Unauthorized", requestId: trace }, { status: 401 }); const { keyId } = await context.params, raw = `qta_${keyId}_${randomBytes(32).toString("base64url")}`; const found = await convexMutation("auth:rotateAgent", { secret: adminSecret(), keyId, tokenHash: tokenHash(raw), prefix: `${raw.slice(0, 18)}…`, now: Date.now() }); return found ? NextResponse.json({ data: { keyId, token: raw } }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
