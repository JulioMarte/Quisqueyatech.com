import "server-only";
import { requestTurnstileVerification } from "@/lib/security/turnstile-core";

export type TurnstileAction = "assessment_start" | "scheduling_book";

function allowedHostnames() {
  const configured = process.env.TURNSTILE_ALLOWED_HOSTNAMES?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (configured?.length) return configured;
  return process.env.NODE_ENV === "production"
    ? ["quisqueyatech.com", "www.quisqueyatech.com"]
    : ["localhost", "127.0.0.1", "quisqueyatech.com", "www.quisqueyatech.com"];
}

export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
  action: TurnstileAction,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) {
    console.warn("[turnstile] Verification rejected", { errorCodes: ["missing-input-response"] });
    return false;
  }
  const result = await requestTurnstileVerification(secret, token, ip, fetch, {
    expectedAction: action,
    allowedHostnames: allowedHostnames(),
    idempotencyKey: crypto.randomUUID(),
    timeoutMs: 8_000,
    retries: 1,
  });
  if (result.success !== true) {
    console.warn("[turnstile] Verification rejected", {
      errorCodes: result["error-codes"] || ["unknown-error"],
      hostname: result.hostname,
      action: result.action,
    });
  }
  return result.success === true;
}
