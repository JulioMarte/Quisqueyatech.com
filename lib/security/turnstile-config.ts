export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export type TurnstileMode = "test" | "production";

export function selectTurnstileCredential(
  nodeEnv: string | undefined,
  productionValue: string | undefined,
  testValue: string,
) {
  if (nodeEnv !== "production") return testValue;
  return productionValue?.trim() || "";
}

export function turnstilePublicConfig(
  nodeEnv = process.env.NODE_ENV,
  productionSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
) {
  const mode: TurnstileMode = nodeEnv === "production" ? "production" : "test";
  const siteKey = selectTurnstileCredential(nodeEnv, productionSiteKey, TURNSTILE_TEST_SITE_KEY);
  return { mode, siteKey, enabled: Boolean(siteKey) };
}

export function turnstileVerificationConstraints(
  mode: TurnstileMode,
  expectedAction: string,
  allowedHostnames: readonly string[],
) {
  return mode === "production" ? { expectedAction, allowedHostnames } : {};
}
