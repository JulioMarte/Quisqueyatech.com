import { isIP } from "node:net";

export function validIp(value: string | null | undefined) {
  const candidate = value?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : undefined;
}

export function trustedRequestIp(headers: Headers, trustProxyHeaders: boolean) {
  if (!trustProxyHeaders) return undefined;
  return (
    validIp(headers.get("cf-connecting-ip")) ||
    validIp(headers.get("x-real-ip")) ||
    validIp(headers.get("x-forwarded-for")?.split(",")[0])
  );
}
