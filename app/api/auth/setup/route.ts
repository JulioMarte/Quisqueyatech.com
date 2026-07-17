import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { handler } from "@/lib/server/auth-server";
import { checkSecurityRateLimit, loginFingerprints, validOrigin } from "@/lib/server/auth";
import { convexQuery } from "@/lib/server/convex";

const input = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(14).max(128),
  setupCode: z.string().min(24).max(512),
});
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  if (!validOrigin(request))
    return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 8_192)
    return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  try {
    for (const key of loginFingerprints(request, parsed.data.email)) {
      const rate = await checkSecurityRateLimit(`setup:${key}`, 5, 60 * 60_000);
      if (!rate.allowed)
        return Response.json(
          { error: "La instalación no está disponible." },
          { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
        );
    }
  } catch {
    return Response.json(
      { error: "El servicio de autenticación no está configurado." },
      { status: 503 },
    );
  }
  const status = (await convexQuery("auth:setupStatus", {})) as { status: string } | null;
  if (!status || status.status !== "uninitialized")
    return Response.json(
      { error: "La instalación ya fue configurada o está en progreso." },
      { status: 403 },
    );
  const recoveryCodes = Array.from(
    { length: 8 },
    () => `QTR-${randomBytes(9).toString("base64url").toUpperCase()}`,
  );
  const url = new URL(request.url);
  url.pathname = "/api/auth/sign-up/email";
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.set("x-admin-setup-code", parsed.data.setupCode);
  headers.set("x-admin-recovery-hashes", JSON.stringify(recoveryCodes.map(digest)));
  headers.delete("content-length");
  const upstream = await handler.POST(
    new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
      }),
    }),
  );
  if (!upstream.ok) return upstream;
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.delete("content-length");
  console.info(
    JSON.stringify({
      scope: "auth",
      operation: "setup",
      status: "configured",
      setupCodeRemovalRequired: true,
    }),
  );
  return Response.json(
    { data: { recoveryCodes, setupCodeRemovalRequired: true } },
    { status: 201, headers: responseHeaders },
  );
}
