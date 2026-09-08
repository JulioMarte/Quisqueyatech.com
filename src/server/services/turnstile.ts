import { randomUUID } from "node:crypto";

const TEST_SECRET = "1x0000000000000000000000000000000AA";
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileAction = "assessment_start" | "scheduling_book";
export type TurnstilePublicCode =
  | "TURNSTILE_CONFIGURATION"
  | "TURNSTILE_EXPIRED"
  | "TURNSTILE_REJECTED"
  | "TURNSTILE_UNAVAILABLE";

export type TurnstileResult =
  | { ok: true; supportId: string }
  | { ok: false; supportId: string; code: TurnstilePublicCode };

export interface TurnstileVerifierOptions {
  secret?: string;
  production?: boolean;
  allowedHostnames?: string[];
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function publicCode(errorCodes: string[]): TurnstilePublicCode {
  if (errorCodes.includes("timeout-or-duplicate")) return "TURNSTILE_EXPIRED";
  if (errorCodes.some((code) => [
    "missing-input-secret",
    "invalid-input-secret",
    "action-mismatch",
    "hostname-mismatch",
    "bad-request",
  ].includes(code))) return "TURNSTILE_CONFIGURATION";
  if (errorCodes.some((code) => code.startsWith("http-") || [
    "request-timeout",
    "network-error",
    "internal-error",
  ].includes(code))) return "TURNSTILE_UNAVAILABLE";
  return "TURNSTILE_REJECTED";
}

export function turnstileVerifier(options: TurnstileVerifierOptions = {}) {
  const production = options.production ?? process.env.NODE_ENV === "production";
  const secret = options.secret?.trim() || (production ? "" : TEST_SECRET);
  const allowedHostnames = new Set(
    (options.allowedHostnames?.length
      ? options.allowedHostnames
      : production
        ? ["quisqueyatech.com", "www.quisqueyatech.com"]
        : ["localhost", "127.0.0.1", "quisqueyatech.com", "www.quisqueyatech.com"])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const timeoutMs = options.timeoutMs ?? 8_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  return async (token: string | undefined, ip: string | undefined, action: TurnstileAction): Promise<TurnstileResult> => {
    const supportId = randomUUID();
    if (!secret) return { ok: false, supportId, code: "TURNSTILE_CONFIGURATION" };
    if (!token?.trim()) return { ok: false, supportId, code: "TURNSTILE_REJECTED" };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body = new URLSearchParams({
        secret,
        response: token,
        idempotency_key: randomUUID(),
      });
      if (ip) body.set("remoteip", ip);
      const response = await fetchImpl(SITEVERIFY_URL, {
        method: "POST",
        body,
        signal: controller.signal,
      });
      if (!response.ok) return { ok: false, supportId, code: "TURNSTILE_UNAVAILABLE" };
      const result = await response.json() as {
        success?: boolean;
        hostname?: string;
        action?: string;
        "error-codes"?: string[];
      };
      if (result.success === true) {
        const hostname = result.hostname?.toLowerCase() ?? "";
        if (result.action !== action) return { ok: false, supportId, code: "TURNSTILE_CONFIGURATION" };
        if (!hostname || !allowedHostnames.has(hostname)) {
          return { ok: false, supportId, code: "TURNSTILE_CONFIGURATION" };
        }
        return { ok: true, supportId };
      }
      return {
        ok: false,
        supportId,
        code: publicCode(result["error-codes"] ?? ["unknown-error"]),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, supportId, code: "TURNSTILE_UNAVAILABLE" };
      }
      return { ok: false, supportId, code: "TURNSTILE_UNAVAILABLE" };
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function turnstileVerifierFromEnv() {
  const allowed = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return turnstileVerifier({
    secret: process.env.TURNSTILE_SECRET_KEY,
    allowedHostnames: allowed.length ? allowed : undefined,
  });
}
