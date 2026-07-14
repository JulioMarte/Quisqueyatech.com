export type AdminApiResult<T> = { data: T | null; error: string | null; requestId: string };

export class AdminRequestError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string) {
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
  try { response = await fetch(input, init); }
  catch { throw new AdminRequestError("No se pudo conectar con el servidor administrativo.", 0); }
  requireAdminResponse(response);
  const payload = await response.json().catch(() => null) as AdminApiResult<T> | null;
  if (!response.ok || !payload || payload.data === null) {
    throw new AdminRequestError(payload?.error || `La operación administrativa falló (${response.status}).`, response.status, payload?.requestId);
  }
  return payload.data;
}
