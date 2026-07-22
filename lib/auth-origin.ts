export function isValidOrigin({
  origin,
  requestUrl,
  siteUrl,
  nodeEnv,
}: {
  origin: string | null;
  requestUrl: string;
  siteUrl?: string;
  nodeEnv: string;
}) {
  if (!origin) return nodeEnv !== "production";
  try {
    const configuredSite = siteUrl?.trim() || requestUrl;
    if (new URL(origin).origin === new URL(configuredSite).origin) return true;
    if (nodeEnv !== "production") {
      return new URL(origin).origin === new URL(requestUrl).origin;
    }
    return false;
  } catch {
    return false;
  }
}
