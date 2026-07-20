import "server-only";

export function requestIp(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "untrusted-proxy";
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
