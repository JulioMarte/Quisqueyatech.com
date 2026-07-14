import "server-only";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import type { FunctionReference, FunctionReturnType } from "convex/server";

export class AuthConfigurationError extends Error {
  constructor(message = "Convex authentication is not configured") {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

type AuthServer = ReturnType<typeof convexBetterAuthNextJs>;
let authServer: AuthServer | undefined;

function requiredUrl(name: "NEXT_PUBLIC_CONVEX_URL" | "NEXT_PUBLIC_CONVEX_SITE_URL") {
  const value = process.env[name]?.trim();
  if (!value) throw new AuthConfigurationError(`${name} is required`);
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new AuthConfigurationError(`${name} must be a valid URL`);
  }
}

function getAuthServer(): AuthServer {
  if (authServer) return authServer;
  authServer = convexBetterAuthNextJs({
    convexUrl: requiredUrl("NEXT_PUBLIC_CONVEX_URL"),
    convexSiteUrl: requiredUrl("NEXT_PUBLIC_CONVEX_SITE_URL"),
  });
  return authServer;
}

export const handler = {
  async GET(request: Request) {
    try { return await getAuthServer().handler.GET(request); }
    catch (error) {
      if (error instanceof AuthConfigurationError) return Response.json({ error: error.message }, { status: 503 });
      throw error;
    }
  },
  async POST(request: Request) {
    try { return await getAuthServer().handler.POST(request); }
    catch (error) {
      if (error instanceof AuthConfigurationError) return Response.json({ error: error.message }, { status: 503 });
      throw error;
    }
  },
};

export function getToken() { return getAuthServer().getToken(); }
export function isAuthenticated() { return getAuthServer().isAuthenticated(); }

export function fetchAuthQuery<Query extends FunctionReference<"query">>(query: Query, args: Query["_args"]): Promise<FunctionReturnType<Query>> {
  return getAuthServer().fetchAuthQuery(query, args);
}

export function fetchAuthMutation<Mutation extends FunctionReference<"mutation">>(mutation: Mutation, args: Mutation["_args"]): Promise<FunctionReturnType<Mutation>> {
  return getAuthServer().fetchAuthMutation(mutation, args);
}

export function fetchAuthAction<Action extends FunctionReference<"action">>(action: Action, args: Action["_args"]): Promise<FunctionReturnType<Action>> {
  return getAuthServer().fetchAuthAction(action, args);
}
