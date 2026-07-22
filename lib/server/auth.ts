import "server-only";
import { createHmac } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { isAgentToken, safeReturnTo, tokenHash } from "@/lib/auth-core";
import { isValidOrigin } from "@/lib/auth-origin";
import { convexMutation } from "@/lib/server/convex";
import { fetchAuthQuery } from "@/lib/server/auth-server";
import { AuthConfigError } from "@/lib/server/auth-errors";
import { requestIp } from "@/lib/server/request-ip";

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

export function loginFingerprints(request: Request, email: string) {
  const secret = authIpHashSecret();
  const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  return [
    `email:${hmac(email.trim().toLowerCase())}`,
    `ip:${hmac(requestIp(request) || "ip-unavailable")}`,
  ];
}

export function requestFingerprint(request: Request, scope: string) {
  const secret = authIpHashSecret();
  return `${scope}:${createHmac("sha256", secret)
    .update(requestIp(request) || "ip-unavailable")
    .digest("hex")}`;
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
  return isValidOrigin({
    origin: request.headers.get("origin"),
    requestUrl: request.url,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim(),
    nodeEnv: process.env.NODE_ENV,
  });
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
