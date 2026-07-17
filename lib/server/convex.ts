import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { AuthConfigurationError } from "@/lib/server/auth-server";

let client: ConvexHttpClient | undefined;

function assessmentStorageSecret() {
  const secret = process.env.ASSESSMENT_STORAGE_SECRET?.trim();
  if (!secret) throw new AuthConfigurationError("ASSESSMENT_STORAGE_SECRET is required");
  return secret;
}

function adminApiSecret() {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) throw new AuthConfigurationError("ADMIN_API_SECRET is required");
  return secret;
}

/** Public Convex function prefixes that require ADMIN_API_SECRET. */
const ADMIN_MACHINE_PREFIXES = [
  "auth:checkSecurityRateLimit",
  "auth:authenticateAgent",
  "auth:recoverAdmin",
  "agenda:create",
  "bookings:",
  "funnel:track",
  "posts:agent",
  "posts:server",
] as const;

function isAdminMachineFunction(name: string) {
  return ADMIN_MACHINE_PREFIXES.some((prefix) =>
    prefix.endsWith(":") ? name.startsWith(prefix) : name === prefix || name.startsWith(prefix),
  );
}

function securedArgs(name: string, args: Record<string, unknown>) {
  if (name.startsWith("assessments:")) {
    return { ...args, serviceSecret: assessmentStorageSecret() };
  }
  if (isAdminMachineFunction(name)) {
    // Prefer explicit arg from caller; otherwise inject server secret so routes
    // cannot forget it. Secret still never ships to the browser.
    if (typeof args.serviceSecret === "string" || typeof args.secret === "string") {
      return args;
    }
    if (
      name.startsWith("posts:") ||
      name.startsWith("bookings:") ||
      name === "auth:authenticateAgent"
    ) {
      return { ...args, secret: adminApiSecret() };
    }
    return { ...args, serviceSecret: adminApiSecret() };
  }
  return args;
}

export function getConvexServerClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) throw new AuthConfigurationError("NEXT_PUBLIC_CONVEX_URL is required");
  client = new ConvexHttpClient(url);
  return client;
}

export async function convexMutation(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return getConvexServerClient().mutation(
    makeFunctionReference<"mutation">(name),
    securedArgs(name, args),
  );
}

export async function convexQuery(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return getConvexServerClient().query(
    makeFunctionReference<"query">(name),
    securedArgs(name, args),
  );
}

export async function convexAction(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return getConvexServerClient().action(
    makeFunctionReference<"action">(name),
    securedArgs(name, args),
  );
}

/**
 * Call a Convex HTTP machine endpoint on *.convex.site with Bearer ADMIN_API_SECRET.
 * Prefer this for high-sensitivity data (e.g. encrypted runtime secrets).
 */
export async function convexMachineFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim()?.replace(/\/$/, "");
  if (!siteUrl) throw new AuthConfigurationError("NEXT_PUBLIC_CONVEX_SITE_URL is required");
  const secret = adminApiSecret();
  const response = await fetch(`${siteUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    method: init?.method || "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secret}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Convex machine endpoint ${path} failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return (await response.json()) as T;
}
