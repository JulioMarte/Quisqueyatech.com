import "server-only";
import { convexMutation } from "@/lib/server/convex";

const localAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLocal(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = localAttempts.get(key);
  if (!current || current.resetAt <= now) {
    localAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit)
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Distributed rate limit via Convex (shared across Next.js replicas).
 * Falls back to process-local limiting only when ADMIN_API_SECRET is absent
 * and NODE_ENV is not production (demo/dev without full backend secrets).
 */
export async function checkRequestLimit(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const serviceSecret = process.env.ADMIN_API_SECRET?.trim();
  if (!serviceSecret) {
    if (process.env.NODE_ENV === "production") return { allowed: false, retryAfter: 60 };
    return checkLocal(key, limit, windowMs);
  }
  try {
    const result = (await convexMutation("auth:checkSecurityRateLimit", {
      serviceSecret,
      key,
      limit,
      windowMs,
    })) as { allowed: boolean; retryAfter: number };
    return result;
  } catch (error) {
    console.error("[rate-limit] distributed limiter failed", error);
    // Fail closed when the shared limiter is unavailable in production.
    if (process.env.NODE_ENV === "production") return { allowed: false, retryAfter: 60 };
    return checkLocal(key, limit, windowMs);
  }
}

export async function allowRequest(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  return (await checkRequestLimit(key, limit, windowMs)).allowed;
}
