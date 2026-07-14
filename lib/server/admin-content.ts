import "server-only";
import { NextResponse } from "next/server";
import { AuthConfigurationError } from "@/lib/server/auth-server";
import { currentAdmin, validOrigin } from "@/lib/server/auth";

export type AdminApiResult<T> = { data: T | null; error: string | null; requestId: string };

export async function authorizeContentRequest(request: Request) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !validOrigin(request)) return null;
  return currentAdmin();
}

export function requestId(request: Request) {
  return request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
}

export function adminJson<T>(requestIdValue: string, data: T, init?: ResponseInit) {
  return NextResponse.json<AdminApiResult<T>>({ data, error: null, requestId: requestIdValue }, init);
}

export function adminFailure(requestIdValue: string, error: string, status: number) {
  return NextResponse.json<AdminApiResult<never>>({ data: null, error, requestId: requestIdValue }, { status });
}

export function adminException(requestIdValue: string, operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Administrative operation failed";
  const status = error instanceof AuthConfigurationError ? 503 : /Unauthorized|Unauthenticated/i.test(message) ? 401 : 503;
  console.error(JSON.stringify({ scope: "admin-api", requestId: requestIdValue, operation, status, error: error instanceof AuthConfigurationError ? "configuration" : "operation_failed" }));
  return adminFailure(requestIdValue, status === 401 ? "Unauthorized" : message, status);
}
