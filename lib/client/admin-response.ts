export type AdminErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";
export type AdminApiResult<T> = {
  data: T | null;
  error: string | null;
  errorCode: AdminErrorCode | null;
  requestId: string;
};
export type AdminPage<T> = { items: T[]; continueCursor: string; isDone: boolean };

export class AdminRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
    readonly errorCode?: AdminErrorCode,
  ) {
    super(message);
    this.name = "AdminRequestError";
  }
}

export function requireAdminResponse(response: Response) {
  if (response.status !== 401) return;
  window.location.assign("/sign-in");
  throw new AdminRequestError("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
}

export async function adminRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    response = await fetch(input, { ...init, signal: init?.signal ?? controller.signal });
  } catch {
    throw new AdminRequestError("No se pudo conectar con el servidor administrativo.", 0);
  } finally {
    window.clearTimeout(timeout);
  }
  requireAdminResponse(response);
  const payload = (await response.json().catch(() => null)) as AdminApiResult<T> | null;
  if (!response.ok || !payload || !("data" in payload)) {
    const reference = payload?.requestId ? ` Referencia: ${payload.requestId}.` : "";
    throw new AdminRequestError(
      (payload?.error || `La operación administrativa falló (${response.status}).`) + reference,
      response.status,
      payload?.requestId,
      payload?.errorCode ?? undefined,
    );
  }
  return payload.data as T;
}
