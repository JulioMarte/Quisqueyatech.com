import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { AuthConfigurationError } from "@/lib/server/auth-server";

let client: ConvexHttpClient | undefined;

function assessmentStorageSecret() {
  const secret = process.env.ASSESSMENT_STORAGE_SECRET;
  if (!secret) throw new AuthConfigurationError("ASSESSMENT_STORAGE_SECRET is required");
  return secret;
}

function securedArgs(name: string, args: Record<string, unknown>) {
  return name.startsWith("assessments:")
    ? { ...args, serviceSecret: assessmentStorageSecret() }
    : args;
}

export function getConvexServerClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) throw new AuthConfigurationError("NEXT_PUBLIC_CONVEX_URL is required");
  client = new ConvexHttpClient(url);
  return client;
}

export async function convexMutation(name: string, args: Record<string, unknown>): Promise<unknown> {
  return getConvexServerClient().mutation(makeFunctionReference<"mutation">(name), securedArgs(name, args));
}

export async function convexQuery(name: string, args: Record<string, unknown>): Promise<unknown> {
  return getConvexServerClient().query(makeFunctionReference<"query">(name), securedArgs(name, args));
}

export async function convexAction(name: string, args: Record<string, unknown>): Promise<unknown> {
  return getConvexServerClient().action(makeFunctionReference<"action">(name), securedArgs(name, args));
}
