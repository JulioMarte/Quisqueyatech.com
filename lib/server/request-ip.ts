import "server-only";

import { trustedRequestIp } from "@/lib/security/request-ip-core";

export function requestIp(request: Request) {
  return trustedRequestIp(request.headers, process.env.TRUST_PROXY_HEADERS === "true");
}
