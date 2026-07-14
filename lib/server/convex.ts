import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

let client: ConvexHttpClient | null | undefined;

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
  return convex.mutation(reference, args);
}

export async function convexQuery(name: string, args: Record<string, unknown>): Promise<unknown | null> {
  const convex = getConvexServerClient();
  if (!convex) return null;
  const reference = makeFunctionReference<"query">(name);
  return convex.query(reference, args);
}

export async function convexAction(name: string, args: Record<string, unknown>): Promise<unknown | null> {
  const convex = getConvexServerClient();
  if (!convex) return null;
  const reference = makeFunctionReference<"action">(name);
  return convex.action(reference, args);
}
