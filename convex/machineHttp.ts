import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdminApiSecret } from "./lib/security";

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
 * Machine-only runtime config (includes secret ciphertexts).
 * Auth is Authorization: Bearer ADMIN_API_SECRET — never a public Convex query arg.
 */
export const runtime = httpAction(async (ctx, request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(null, { status: 405 });
  }
  try {
    requireAdminApiSecret(bearerToken(request));
  } catch {
    return unauthorized();
  }
  const data = await ctx.runQuery(internal.settings.internalRuntime, {});
  return json(data);
});
