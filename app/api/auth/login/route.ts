import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { adminEmail, adminSecret, createAdminSession, loginFingerprints, safeReturnTo, SESSION_COOKIE, SESSION_MAX_AGE, validOrigin, verifyPassword } from "@/lib/server/auth";
import { convexMutation, convexQuery } from "@/lib/server/convex";
const input = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(1024), returnTo: z.string().max(300).optional() });
export async function POST(request: Request) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !process.env.ADMIN_PASSWORD_HASH || !adminEmail()) return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  const email = parsed.data.email.trim().toLowerCase(), keys = loginFingerprints(request, email), now = Date.now();
  const states = await Promise.all(keys.map(key => convexQuery("auth:checkLogin", { secret: adminSecret(), key, now }) as Promise<{ blocked: boolean; retryAfter: number } | null>));
  const blocked = states.some(state => state?.blocked), passwordOk = await verifyPassword(parsed.data.password), valid = !blocked && email === adminEmail() && passwordOk;
  const updates = await Promise.all(keys.map(key => convexMutation("auth:loginStatus", { secret: adminSecret(), key, now, success: valid }) as Promise<{ blocked: boolean; retryAfter: number }>));
  const limited = blocked || updates.some(state => state?.blocked), retryAfter = Math.max(30, ...states.map(state => state?.retryAfter || 0), ...updates.map(state => state?.retryAfter || 0));
  if (!valid) return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: limited ? 429 : 401, headers: limited ? { "Retry-After": String(retryAfter) } : undefined });
  const jar = await cookies(), previous = jar.get(SESSION_COOKIE)?.value, raw = await createAdminSession(previous);
  const response = NextResponse.json({ data: { returnTo: safeReturnTo(parsed.data.returnTo) } });
  response.cookies.set(SESSION_COOKIE, raw, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE });
  return response;
}
