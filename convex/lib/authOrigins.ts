export function authTrustedOrigins(siteUrl: string, configuredOrigins?: string) {
  const origins = [siteUrl];
  for (const candidate of configuredOrigins?.split(",") ?? []) {
    const origin = candidate.trim();
    if (!origin) continue;
    if (!/^https?:\/\//i.test(origin)) {
      throw new Error("AUTH_TRUSTED_ORIGINS entries must use http or https");
    }
    origins.push(origin);
  }
  return [...new Set(origins)];
}
