import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { handler } from "@/lib/server/auth-server";
import {
  authConfigProbe,
  checkSecurityRateLimit,
  loginFingerprints,
  validOrigin,
} from "@/lib/server/auth";
import { authConfigResponse } from "@/lib/server/auth-errors";
import { convexQuery } from "@/lib/server/convex";

const input = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(14).max(128),
  setupCode: z.string().max(512).optional().default(""),
});
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  if (!validOrigin(request)) {
    return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 8_192) {
    return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  let setupCodeRequired = false;
  try {
    for (const key of loginFingerprints(request, parsed.data.email)) {
      const rate = await checkSecurityRateLimit(`setup:${key}`, 5, 60 * 60_000);
      if (!rate.allowed) {
        return Response.json(
          { error: "La instalación no está disponible.", code: "RATE_LIMITED" },
          { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
        );
      }
    }
  } catch (error) {
    return authConfigResponse(error, "auth:setup:rate-limit");
  }

  try {
    const status = (await convexQuery("auth:setupStatus", {})) as {
      status: string;
      setupCodeRequired?: boolean;
    } | null;
    setupCodeRequired = Boolean(status?.setupCodeRequired);
    if (!status || status.status !== "uninitialized") {
      return Response.json(
        { error: "La instalación ya fue configurada o está en progreso." },
        { status: 403 },
      );
    }
    if (setupCodeRequired && parsed.data.setupCode.trim().length < 24) {
      return Response.json(
        {
          error: "Se requiere un código de instalación válido.",
          code: "SETUP_CODE_REQUIRED",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    return authConfigResponse(error, "auth:setup:status");
  }

  const recoveryCodes = Array.from(
    { length: 8 },
    () => `QTR-${randomBytes(9).toString("base64url").toUpperCase()}`,
  );
  const url = new URL(request.url);
  url.pathname = "/api/auth/sign-up/email";
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.set("x-admin-setup-code", parsed.data.setupCode.trim());
  headers.set("x-admin-recovery-hashes", JSON.stringify(recoveryCodes.map(digest)));
  headers.delete("content-length");

  try {
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
    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      console.error(
        JSON.stringify({
          scope: "auth:setup:sign-up",
          status: upstream.status,
          body: body.slice(0, 300),
          probe: authConfigProbe(),
        }),
      );
      if (upstream.status >= 500) {
        return Response.json(
          {
            error:
              "No se pudo crear el administrador. Revisa SITE_URL y BETTER_AUTH_SECRET en Convex.",
            code: "SETUP_UPSTREAM_ERROR",
          },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
      return new Response(body || upstream.statusText, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
      });
    }
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.delete("content-length");
    console.info(
      JSON.stringify({
        scope: "auth",
        operation: "setup",
        status: "configured",
        setupCodeRemovalRequired: setupCodeRequired,
      }),
    );
    return Response.json(
      {
        data: {
          recoveryCodes,
          setupCodeRemovalRequired: setupCodeRequired,
        },
      },
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    return authConfigResponse(error, "auth:setup:sign-up");
  }
}
