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
    const originUrl = new URL(origin);
    const requestOrigin = new URL(requestUrl);
    const configuredSite = siteUrl?.trim() || requestUrl;
    if (originUrl.origin === new URL(configuredSite).origin) return true;
    if (nodeEnv !== "production") {
      if (originUrl.origin === requestOrigin.origin) return true;
      return sameLoopbackOrigin(originUrl, requestOrigin);
    }
    return false;
  } catch {
    return false;
  }
}

function sameLoopbackOrigin(left: URL, right: URL) {
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  return (
    left.protocol === "http:" &&
    right.protocol === "http:" &&
    left.port === right.port &&
    loopbackHosts.has(left.hostname) &&
    loopbackHosts.has(right.hostname)
  );
}
