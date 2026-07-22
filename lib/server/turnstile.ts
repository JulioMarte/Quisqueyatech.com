import "server-only";

import { createHmac } from "node:crypto";
import { requestTurnstileVerification } from "@/lib/security/turnstile-core";
import {
  selectTurnstileCredential,
  turnstileVerificationConstraints,
  type TurnstileMode,
} from "@/lib/security/turnstile-config";
import { diagnosticLog } from "@/lib/server/diagnostic-log";

const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

export type TurnstileAction = "assessment_start" | "scheduling_book";
export type TurnstilePublicCode =
  "TURNSTILE_CONFIGURATION" | "TURNSTILE_EXPIRED" | "TURNSTILE_REJECTED" | "TURNSTILE_UNAVAILABLE";

export type TurnstileResult =
  | { ok: true; supportId: string }
  | {
      ok: false;
      supportId: string;
      code: TurnstilePublicCode;
      errorCodes: string[];
      hostname?: string;
      action?: string;
    };

export function turnstileServerConfig(
  nodeEnv = process.env.NODE_ENV,
  productionSecret = process.env.TURNSTILE_SECRET_KEY,
) {
  const mode: TurnstileMode = nodeEnv === "production" ? "production" : "test";
  const secret = selectTurnstileCredential(nodeEnv, productionSecret, TURNSTILE_TEST_SECRET_KEY);
  return { mode, secret, enabled: Boolean(secret) };
}

export function turnstileAllowedHostnames() {
  const configured = process.env.TURNSTILE_ALLOWED_HOSTNAMES?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (configured?.length) return configured;
  return process.env.NODE_ENV === "production"
    ? ["quisqueyatech.com", "www.quisqueyatech.com"]
    : ["localhost", "127.0.0.1", "quisqueyatech.com", "www.quisqueyatech.com"];
}

function publicCode(errorCodes: readonly string[]): TurnstilePublicCode {
  if (errorCodes.includes("timeout-or-duplicate")) return "TURNSTILE_EXPIRED";
  if (
    errorCodes.some(
      (code) =>
        code === "missing-input-secret" ||
        code === "invalid-input-secret" ||
        code === "action-mismatch" ||
        code === "hostname-mismatch" ||
        code === "bad-request",
    )
  )
    return "TURNSTILE_CONFIGURATION";
  if (
    errorCodes.some(
      (code) =>
        code.startsWith("http-") ||
        code === "request-timeout" ||
        code === "network-error" ||
        code === "internal-error",
    )
  )
    return "TURNSTILE_UNAVAILABLE";
  return "TURNSTILE_REJECTED";
}

function ipFingerprint(ip: string | undefined) {
  if (!ip) return "unavailable";
  const secret =
    process.env.AUTH_IP_HASH_SECRET?.trim() || process.env.ADMIN_API_SECRET?.trim() || "";
  if (!secret) return "unavailable";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 16);
}

export async function verifyTurnstile(
  token: string | undefined,
  ip: string | undefined,
  action: TurnstileAction,
): Promise<TurnstileResult> {
  const supportId = crypto.randomUUID();
  const { secret, mode } = turnstileServerConfig();
  if (!secret) {
    const failure: TurnstileResult = {
      ok: false,
      supportId,
      code: "TURNSTILE_CONFIGURATION",
      errorCodes: ["missing-input-secret"],
    };
    diagnosticLog(
      "turnstile",
      "verification_rejected",
      {
        supportId,
        mode,
        expectedAction: action,
        errorCodes: failure.errorCodes,
        ipHash: ipFingerprint(ip),
      },
      "error",
    );
    return failure;
  }

  const constraints = turnstileVerificationConstraints(mode, action, turnstileAllowedHostnames());
  const result = await requestTurnstileVerification(secret, token || "", ip, fetch, {
    ...constraints,
    idempotencyKey: crypto.randomUUID(),
    timeoutMs: 8_000,
    retries: 1,
  });
  if (result.success === true) {
    diagnosticLog("turnstile", "verification_accepted", {
      supportId,
      mode,
      expectedAction: action,
    });
    return { ok: true, supportId };
  }

  const errorCodes = result["error-codes"] || ["unknown-error"];
  const failure: TurnstileResult = {
    ok: false,
    supportId,
    code: publicCode(errorCodes),
    errorCodes,
    hostname: result.hostname,
    action: result.action,
  };
  diagnosticLog(
    "turnstile",
    "verification_rejected",
    {
      supportId,
      mode,
      expectedAction: action,
      receivedAction: result.action,
      hostname: result.hostname,
      errorCodes,
      ipHash: ipFingerprint(ip),
    },
    "error",
  );
  return failure;
}
