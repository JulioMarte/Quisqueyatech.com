import "server-only";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function allowRequest(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
