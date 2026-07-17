import "server-only";
import { convexMutation } from "@/lib/server/convex";

const localAttempts = new Map<string, { count: number; resetAt: number }>();

function allowLocal(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = localAttempts.get(key);
  if (!current || current.resetAt <= now) {
    localAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/**
 * Distributed rate limit via Convex (shared across Next.js replicas).
 * Falls back to process-local limiting only when ADMIN_API_SECRET is absent
 * and NODE_ENV is not production (demo/dev without full backend secrets).
 */
export async function allowRequest(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const serviceSecret = process.env.ADMIN_API_SECRET?.trim();
  if (!serviceSecret) {
    if (process.env.NODE_ENV === "production") return false;
    return allowLocal(key, limit, windowMs);
  }
  try {
    const result = (await convexMutation("auth:checkSecurityRateLimit", {
      serviceSecret,
      key,
      limit,
      windowMs,
    })) as { allowed: boolean };
    return result.allowed;
  } catch (error) {
    console.error("[rate-limit] distributed limiter failed", error);
    // Fail closed when the shared limiter is unavailable in production.
    if (process.env.NODE_ENV === "production") return false;
    return allowLocal(key, limit, windowMs);
  }
}
