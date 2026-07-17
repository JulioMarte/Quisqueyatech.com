export type TurnstileVerificationResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export async function requestTurnstileVerification(
  secret: string,
  token: string,
  ip: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<TurnstileVerificationResult> {
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    cache: "no-store",
  });
  if (!response.ok) return { success: false, "error-codes": [`http-${response.status}`] };
  return (await response.json()) as TurnstileVerificationResult;
}
