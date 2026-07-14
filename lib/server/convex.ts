import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

let client: ConvexHttpClient | null | undefined;

function assessmentStorageSecret() {
  const secret = process.env.ASSESSMENT_STORAGE_SECRET;
  if (!secret) throw new Error("ASSESSMENT_STORAGE_SECRET is required");
  return secret;
}

function securedArgs(name: string, args: Record<string, unknown>) {
  return name.startsWith("assessments:") ? { ...args, serviceSecret: assessmentStorageSecret() } : args;
}

export function getConvexServerClient() {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  client = url ? new ConvexHttpClient(url) : null;
  return client;
}

export async function convexMutation(name: string, args: Record<string, unknown>): Promise<unknown | null> {
  const convex = getConvexServerClient();
  if (!convex) return null;
  const reference = makeFunctionReference<"mutation">(name);
  return convex.mutation(reference, securedArgs(name, args));
}

export async function convexQuery(name: string, args: Record<string, unknown>): Promise<unknown | null> {
  const convex = getConvexServerClient();
  if (!convex) return null;
  const reference = makeFunctionReference<"query">(name);
  return convex.query(reference, securedArgs(name, args));
}

export async function convexAction(name: string, args: Record<string, unknown>): Promise<unknown | null> {
  const convex = getConvexServerClient();
  if (!convex) return null;
  const reference = makeFunctionReference<"action">(name);
  return convex.action(reference, args);
}
