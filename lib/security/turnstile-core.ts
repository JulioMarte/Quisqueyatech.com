export type TurnstileVerificationResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export type TurnstileVerificationOptions = {
  expectedAction?: string;
  allowedHostnames?: readonly string[];
  idempotencyKey?: string;
  timeoutMs?: number;
  retries?: number;
};

export async function requestTurnstileVerification(
  secret: string,
  token: string,
  ip: string | undefined,
  fetcher: typeof fetch = fetch,
  options: TurnstileVerificationOptions = {},
): Promise<TurnstileVerificationResult> {
  if (!token || token.length > 2_048)
    return {
      success: false,
      "error-codes": [token ? "response-too-long" : "missing-input-response"],
    };
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  if (options.idempotencyKey) body.set("idempotency_key", options.idempotencyKey);

  const attempts = Math.max(1, Math.min(2, (options.retries ?? 1) + 1));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
      });
      if (!response.ok) {
        if (attempt + 1 < attempts && response.status >= 500) continue;
        return { success: false, "error-codes": [`http-${response.status}`] };
      }
      const result = (await response.json()) as TurnstileVerificationResult;
      if (
        result.success === true &&
        options.expectedAction &&
        result.action !== options.expectedAction
      )
        return { ...result, success: false, "error-codes": ["action-mismatch"] };
      if (
        result.success === true &&
        options.allowedHostnames?.length &&
        (!result.hostname || !options.allowedHostnames.includes(result.hostname.toLowerCase()))
      )
        return { ...result, success: false, "error-codes": ["hostname-mismatch"] };
      return result;
    } catch (error) {
      if (attempt + 1 < attempts) continue;
      return {
        success: false,
        "error-codes": [
          error instanceof DOMException && error.name === "TimeoutError"
            ? "request-timeout"
            : "network-error",
        ],
      };
    }
  }
  return { success: false, "error-codes": ["internal-error"] };
}
