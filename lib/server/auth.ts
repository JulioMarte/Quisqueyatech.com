import "server-only";
import { createHmac } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { isAgentToken, safeReturnTo, tokenHash } from "@/lib/auth-core";
import { convexMutation } from "@/lib/server/convex";
import { fetchAuthQuery } from "@/lib/server/auth-server";

export { safeReturnTo, tokenHash };
export type AdminActor = { type: "admin"; id: string; label: string; email: string };

export function adminSecret() {
  return process.env.ADMIN_API_SECRET || "";
}

export async function currentAdmin(): Promise<AdminActor | null> {
  const admin = await fetchAuthQuery(api.auth.currentAdmin, {});
  return admin ? { type: "admin", id: admin.userId, label: admin.name || admin.email, email: admin.email } : null;
}

function requestIp(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "untrusted-proxy";
  return (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}

export function loginFingerprints(request: Request, email: string) {
  const secret = process.env.AUTH_IP_HASH_SECRET;
  if (!secret) throw new Error("AUTH_IP_HASH_SECRET is required");
  const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  return [`email:${hmac(email.trim().toLowerCase())}`, `ip:${hmac(requestIp(request))}`];
}

export function requestFingerprint(request: Request, scope: string) {
  const secret = process.env.AUTH_IP_HASH_SECRET;
  if (!secret) throw new Error("AUTH_IP_HASH_SECRET is required");
  return `${scope}:${createHmac("sha256", secret).update(requestIp(request)).digest("hex")}`;
}

export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try { return new URL(origin).origin === new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin; } catch { return false; }
}

export async function requireContentAgent(request: Request, operation = "request") {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return { status: "unauthorized" as const };
  const raw = authorization.slice(7).trim();
  if (!isAgentToken(raw)) return { status: "unauthorized" as const };
  return convexMutation("auth:authenticateAgent", { secret: adminSecret(), tokenHash: tokenHash(raw), operation, now: Date.now() }) as Promise<{ status: "ok"; agent: { keyId: string; name: string } } | { status: "limited"; retryAfter: number } | { status: "unauthorized" }>;
}
