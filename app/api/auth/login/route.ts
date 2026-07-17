import { handler } from "@/lib/server/auth-server";
import { checkSecurityRateLimit, loginFingerprints, validOrigin } from "@/lib/server/auth";
import { authConfigResponse } from "@/lib/server/auth-errors";

export async function POST(request: Request) {
  if (!validOrigin(request)) {
    return Response.json({ message: "Solicitud no permitida." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 8_192) {
    return Response.json({ message: "Solicitud demasiado grande." }, { status: 413 });
  }
  const body = (await request
    .clone()
    .json()
    .catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email || email.length > 254) {
    return Response.json({ message: "Credenciales no válidas." }, { status: 400 });
  }
  try {
    for (const key of loginFingerprints(request, email)) {
      const rate = await checkSecurityRateLimit(`login:${key}`, 10, 15 * 60_000);
      if (!rate.allowed) {
        return Response.json(
          { message: "Credenciales no válidas." },
          { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
        );
      }
    }
  } catch (error) {
    const response = authConfigResponse(error, "auth:login:rate-limit");
    const payload = await response.json();
    return Response.json(
      { message: payload.error, code: payload.code },
      { status: response.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  const url = new URL(request.url);
  url.pathname = "/api/auth/sign-in/email";
  return handler.POST(new Request(url, request));
}
