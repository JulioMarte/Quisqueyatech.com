import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { convexMutation, convexQuery } from "@/lib/server/convex";
import { isAgentToken, tokenHash, verifyScryptPassword } from "@/lib/auth-core";
export { safeReturnTo, tokenHash } from "@/lib/auth-core";
export const SESSION_COOKIE = "qt_admin_session";
export const SESSION_MAX_AGE = 8 * 60 * 60;
export type AdminActor = { type: "admin"; id: string; label: string; email: string };
export function adminSecret() { const value = process.env.ADMIN_API_SECRET; if (!value) throw new Error("ADMIN_API_SECRET is required"); return value; }
export function adminEmail() { return (process.env.ADMIN_EMAIL || "").trim().toLowerCase(); }
export function sessionVersion() { return process.env.AUTH_SESSION_VERSION || "1"; }
export async function verifyPassword(password: string, encoded = process.env.ADMIN_PASSWORD_HASH || "") { return verifyScryptPassword(password, encoded); }
export async function currentAdmin(): Promise<AdminActor | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw || !process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.ADMIN_API_SECRET) return null;
  const result = await convexQuery("auth:verifySession", { secret: adminSecret(), tokenHash: tokenHash(raw), version: sessionVersion(), now: Date.now() }) as { email: string } | null;
  if (!result || result.email.toLowerCase() !== adminEmail()) return null;
  return { type: "admin", id: result.email.toLowerCase(), label: result.email, email: result.email };
}
export async function createAdminSession(previous?: string) { const raw = randomBytes(32).toString("base64url"), now = Date.now(); const created = await convexMutation("auth:createSession", { secret: adminSecret(), tokenHash: tokenHash(raw), email: adminEmail(), version: sessionVersion(), now, expiresAt: now + SESSION_MAX_AGE * 1000, previousHash: previous ? tokenHash(previous) : undefined }); if (!created) throw new Error("Authentication storage is unavailable"); return raw; }
export async function revokeAdminSession(raw?: string) { if (raw) await convexMutation("auth:revokeSession", { secret: adminSecret(), tokenHash: tokenHash(raw), now: Date.now() }); }
function requestIp(request: Request) { if (process.env.TRUST_PROXY_HEADERS !== "true") return "untrusted-proxy"; return (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim(); }
export function loginFingerprints(request: Request, email: string) { const secret = process.env.AUTH_IP_HASH_SECRET || adminSecret(), hmac = (value: string) => createHmac("sha256", secret).update(value).digest("hex"); return [`email:${hmac(email.trim().toLowerCase())}`, `ip:${hmac(requestIp(request))}`]; }
export function validOrigin(request: Request) { const origin = request.headers.get("origin"); if (!origin) return process.env.NODE_ENV !== "production"; try { return new URL(origin).origin === new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin; } catch { return false; } }
export async function requireContentAgent(request: Request, operation = "request") { const authorization = request.headers.get("authorization"); if (!authorization?.startsWith("Bearer ")) return { status: "unauthorized" as const }; const raw = authorization.slice(7).trim(); if (!isAgentToken(raw)) return { status: "unauthorized" as const }; return convexMutation("auth:authenticateAgent", { secret: adminSecret(), tokenHash: tokenHash(raw), operation, now: Date.now() }) as Promise<{ status: "ok"; agent: { keyId: string; name: string } } | { status: "limited"; retryAfter: number } | { status: "unauthorized" }>; }
