import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeAdminSession, SESSION_COOKIE, validOrigin } from "@/lib/server/auth";
export async function POST(request: Request) { if (!validOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 }); const raw = (await cookies()).get(SESSION_COOKIE)?.value; await revokeAdminSession(raw); const response = NextResponse.json({ data: { ok: true } }); response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 }); return response; }
