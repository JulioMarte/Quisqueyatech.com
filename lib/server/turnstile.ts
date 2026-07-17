import "server-only";
import { requestTurnstileVerification } from "@/lib/security/turnstile-core";

export async function verifyTurnstile(token?: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) {
    console.warn("[turnstile] Verification rejected", { errorCodes: ["missing-input-response"] });
    return false;
  }
  const result = await requestTurnstileVerification(secret, token, ip);
  if (result.success !== true) {
    console.warn("[turnstile] Verification rejected", {
      errorCodes: result["error-codes"] || ["unknown-error"],
      hostname: result.hostname,
      action: result.action,
    });
  }
  return result.success === true;
}
