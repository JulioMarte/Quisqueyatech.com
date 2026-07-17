import "server-only";
import { createHmac } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { isAgentToken, safeReturnTo, tokenHash } from "@/lib/auth-core";
import { convexMutation } from "@/lib/server/convex";
import { fetchAuthQuery } from "@/lib/server/auth-server";
import { AuthConfigError } from "@/lib/server/auth-errors";

export { safeReturnTo, tokenHash };
export type AdminActor = { type: "admin"; id: string; label: string; email: string };

export function adminSecret() {
  const value = process.env.ADMIN_API_SECRET?.trim();
  if (!value) {
    throw new AuthConfigError("MISSING_ADMIN_API_SECRET", "ADMIN_API_SECRET is required");
  }
  return value;
}

/** Prefer dedicated hash secret; fall back to machine secret to reduce Coolify friction. */
export function authIpHashSecret() {
  const dedicated = process.env.AUTH_IP_HASH_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = process.env.ADMIN_API_SECRET?.trim();
  if (fallback) return fallback;
  throw new AuthConfigError(
    "MISSING_AUTH_IP_HASH_SECRET",
    "AUTH_IP_HASH_SECRET or ADMIN_API_SECRET is required",
  );
}

export async function currentAdmin(): Promise<AdminActor | null> {
  const admin = await fetchAuthQuery(api.auth.currentAdmin, {});
  return admin
    ? { type: "admin", id: admin.userId, label: admin.name || admin.email, email: admin.email }
    : null;
}

function requestIp(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "untrusted-proxy";
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  ).trim();
}

export function loginFingerprints(request: Request, email: string) {
  const secret = authIpHashSecret();
  const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  return [`email:${hmac(email.trim().toLowerCase())}`, `ip:${hmac(requestIp(request))}`];
}

export function requestFingerprint(request: Request, scope: string) {
  const secret = authIpHashSecret();
  return `${scope}:${createHmac("sha256", secret).update(requestIp(request)).digest("hex")}`;
}

export async function checkSecurityRateLimit(key: string, limit: number, windowMs: number) {
  return convexMutation("auth:checkSecurityRateLimit", {
    serviceSecret: adminSecret(),
    key,
    limit,
    windowMs,
  }) as Promise<{ allowed: boolean; retryAfter: number }>;
}

export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || request.url;
    return new URL(origin).origin === new URL(site).origin;
  } catch {
    return false;
  }
}

export function authConfigProbe() {
  return {
    hasAdminApiSecret: Boolean(process.env.ADMIN_API_SECRET?.trim()),
    hasAuthIpHashSecret: Boolean(
      process.env.AUTH_IP_HASH_SECRET?.trim() || process.env.ADMIN_API_SECRET?.trim(),
    ),
    hasConvexUrl: Boolean(
      process.env.CONVEX_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim(),
    ),
    hasConvexSiteUrl: Boolean(
      process.env.CONVEX_SITE_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim(),
    ),
    hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim()),
  };
}

export async function requireContentAgent(request: Request, operation = "request") {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return { status: "unauthorized" as const };
  const raw = authorization.slice(7).trim();
  if (!isAgentToken(raw)) return { status: "unauthorized" as const };
  return convexMutation("auth:authenticateAgent", {
    secret: adminSecret(),
    tokenHash: tokenHash(raw),
    operation,
    now: Date.now(),
  }) as Promise<
    | { status: "ok"; agent: { keyId: string; name: string } }
    | { status: "limited"; retryAfter: number }
    | { status: "unauthorized" }
  >;
}
