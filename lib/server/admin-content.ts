import "server-only";
import { NextResponse } from "next/server";
import { AuthConfigurationError } from "@/lib/server/auth-server";
import { currentAdmin, validOrigin } from "@/lib/server/auth";

export type AdminErrorCode = "BAD_REQUEST" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "CONFIGURATION_ERROR" | "INTERNAL_ERROR";
export type AdminApiResult<T> = { data: T | null; error: string | null; errorCode: AdminErrorCode | null; requestId: string };
export type AdminPage<T> = { items: T[]; continueCursor: string; isDone: boolean };

export class AdminHttpError extends Error {
  constructor(readonly status: number, readonly errorCode: AdminErrorCode, message: string) {
    super(message);
    this.name = "AdminHttpError";
  }
}

export async function authorizeContentRequest(request: Request) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !validOrigin(request)) throw new AdminHttpError(403, "FORBIDDEN", "Solicitud no permitida.");
  return currentAdmin();
}

export function requestId(request: Request) {
  return request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
}

export async function readAdminJson(request: Request, maxBytes = 128_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new AdminHttpError(413, "BAD_REQUEST", "La solicitud es demasiado grande.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new AdminHttpError(413, "BAD_REQUEST", "La solicitud es demasiado grande.");
  try { return JSON.parse(text); }
  catch { throw new AdminHttpError(400, "BAD_REQUEST", "La solicitud debe contener JSON válido."); }
}

export function adminJson<T>(requestIdValue: string, data: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers); headers.set("x-request-id", requestIdValue); headers.set("cache-control", "no-store");
  return NextResponse.json<AdminApiResult<T>>({ data, error: null, errorCode: null, requestId: requestIdValue }, { ...init, headers });
}

export function adminFailure(requestIdValue: string, error: string, status: number, errorCode?: AdminErrorCode) {
  const inferred: AdminErrorCode = errorCode ?? (status === 400 || status === 413 ? "BAD_REQUEST" : status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : status === 429 ? "RATE_LIMITED" : status === 502 ? "UPSTREAM_ERROR" : status === 503 ? "CONFIGURATION_ERROR" : "INTERNAL_ERROR");
  return NextResponse.json<AdminApiResult<never>>({ data: null, error, errorCode: inferred, requestId: requestIdValue }, { status, headers: { "x-request-id": requestIdValue, "cache-control": "no-store" } });
}

export function adminException(requestIdValue: string, operation: string, error: unknown) {
  const internalMessage = error instanceof Error ? error.message : "";
  let status = 500, errorCode: AdminErrorCode = "INTERNAL_ERROR", publicMessage = "No se pudo completar la operación administrativa.";
  if (error instanceof AdminHttpError) ({ status, errorCode, message: publicMessage } = error);
  else if (error instanceof AuthConfigurationError || /CONFIGURATION_ERROR|is required|not configured|must be a valid URL/i.test(internalMessage)) { status = 503; errorCode = "CONFIGURATION_ERROR"; publicMessage = "El servicio administrativo no está configurado."; }
  else if (/UNAUTHENTICATED|Authentication required|Unauthenticated/i.test(internalMessage)) { status = 401; errorCode = "UNAUTHENTICATED"; publicMessage = "Tu sesión expiró. Vuelve a iniciar sesión."; }
  else if (/FORBIDDEN|Administrator access|Unauthorized/i.test(internalMessage)) { status = 403; errorCode = "FORBIDDEN"; publicMessage = "No tienes permiso para realizar esta operación."; }
  else if (/NOT_FOUND|not found/i.test(internalMessage)) { status = 404; errorCode = "NOT_FOUND"; publicMessage = "El recurso solicitado no existe."; }
  else if (/CONFLICT|already|stale|sending|sent/i.test(internalMessage)) { status = 409; errorCode = "CONFLICT"; publicMessage = "El recurso cambió o la operación ya está en curso."; }
  else if (/VALIDATION_ERROR|invalid/i.test(internalMessage)) { status = 400; errorCode = "BAD_REQUEST"; publicMessage = "Los datos enviados no son válidos."; }
  console.error(JSON.stringify({ scope: "admin-api", requestId: requestIdValue, operation, result: "error", status, errorCode }));
  return adminFailure(requestIdValue, publicMessage, status, errorCode);
}
