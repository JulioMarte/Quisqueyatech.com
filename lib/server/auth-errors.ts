export type AuthConfigCode =
  | "MISSING_ADMIN_API_SECRET"
  | "MISSING_AUTH_IP_HASH_SECRET"
  | "MISSING_CONVEX_URL"
  | "MISSING_CONVEX_SITE_URL"
  | "INVALID_CONVEX_URL"
  | "CONVEX_UNAUTHORIZED"
  | "CONVEX_UNREACHABLE"
  | "RATE_LIMIT_UNAVAILABLE"
  | "AUTH_CONFIGURATION_ERROR";

export class AuthConfigError extends Error {
  readonly code: AuthConfigCode;
  constructor(code: AuthConfigCode, message: string) {
    super(message);
    this.name = "AuthConfigError";
    this.code = code;
  }
}

export function classifyAuthError(error: unknown): {
  code: AuthConfigCode;
  publicMessage: string;
  status: number;
} {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (/admin_api_secret/i.test(message)) {
    return {
      code: "MISSING_ADMIN_API_SECRET",
      publicMessage: "Falta ADMIN_API_SECRET en el servidor Next.js (Coolify runtime).",
      status: 503,
    };
  }
  if (/auth_ip_hash_secret/i.test(message)) {
    return {
      code: "MISSING_AUTH_IP_HASH_SECRET",
      publicMessage:
        "Falta AUTH_IP_HASH_SECRET (o ADMIN_API_SECRET como fallback) en Coolify runtime.",
      status: 503,
    };
  }
  if (/convex_url is required|next_public_convex_url/i.test(message)) {
    return {
      code: "MISSING_CONVEX_URL",
      publicMessage:
        "Falta NEXT_PUBLIC_CONVEX_URL (buildtime) o CONVEX_URL (runtime) en el servidor.",
      status: 503,
    };
  }
  if (/convex_site_url is required|next_public_convex_site_url/i.test(message)) {
    return {
      code: "MISSING_CONVEX_SITE_URL",
      publicMessage:
        "Falta NEXT_PUBLIC_CONVEX_SITE_URL (buildtime) o CONVEX_SITE_URL (runtime) en el servidor.",
      status: 503,
    };
  }
  if (/must be a valid url/i.test(message)) {
    return {
      code: "INVALID_CONVEX_URL",
      publicMessage: "La URL de Convex no es válida.",
      status: 503,
    };
  }
  if (/unauthorized|forbidden|unauthenticated/i.test(lower)) {
    return {
      code: "CONVEX_UNAUTHORIZED",
      publicMessage:
        "Convex rechazó la credencial de máquina. ADMIN_API_SECRET de Coolify debe coincidir con Convex.",
      status: 503,
    };
  }
  if (
    name === "AuthConfigurationError" ||
    error instanceof AuthConfigError ||
    /not configured|configuration/i.test(lower)
  ) {
    return {
      code: error instanceof AuthConfigError ? error.code : "AUTH_CONFIGURATION_ERROR",
      publicMessage:
        error instanceof AuthConfigError
          ? error.message
          : "El servicio de autenticación no está configurado.",
      status: 503,
    };
  }
  if (/fetch failed|network|econnrefused|enotfound|timeout/i.test(lower)) {
    return {
      code: "CONVEX_UNREACHABLE",
      publicMessage: "No se pudo contactar a Convex Cloud desde el servidor.",
      status: 503,
    };
  }
  return {
    code: "RATE_LIMIT_UNAVAILABLE",
    publicMessage: "El servicio de autenticación no está disponible temporalmente.",
    status: 503,
  };
}

export function authConfigResponse(error: unknown, scope: string) {
  const classified = classifyAuthError(error);
  console.error(
    JSON.stringify({
      scope,
      code: classified.code,
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  return Response.json(
    { error: classified.publicMessage, code: classified.code },
    { status: classified.status, headers: { "Cache-Control": "no-store" } },
  );
}
