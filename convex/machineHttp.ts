import { httpAction } from "./_generated/server";
import { requireAdminApiSecret, requireAssessmentWorkerSecret } from "./lib/security";
import { runtimeEnvironment, workerEnvironment } from "./runtimeEnvironment";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Machine-only runtime config sourced from this Convex deployment.
 * Auth is Authorization: Bearer ADMIN_API_SECRET — never a public Convex query arg.
 */
export const runtime = httpAction(async (_ctx, request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(null, { status: 405 });
  }
  try {
    requireAdminApiSecret(bearerToken(request));
  } catch {
    return unauthorized();
  }
  return json({ config: runtimeEnvironment(), source: "convex-env" });
});

/** Worker-only bootstrap. It intentionally returns no application/admin secrets. */
export const workerBootstrap = httpAction(async (_ctx, request) => {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  try {
    requireAssessmentWorkerSecret(bearerToken(request));
  } catch {
    return unauthorized();
  }
  const config = workerEnvironment();
  const missing = Object.entries(config)
    .filter(([key, value]) =>
      ["livekitUrl", "livekitApiKey", "livekitApiSecret", "geminiApiKey"].includes(key) && !value,
    )
    .map(([key]) => key);
  if (missing.length) return json({ error: "Worker configuration is incomplete", missing }, 503);
  return json({ config, source: "convex-env" });
});
