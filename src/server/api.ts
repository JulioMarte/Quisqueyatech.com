import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { toNodeHandler } from "better-auth/node";
import { createAuthRuntime } from "./auth";
import { SQLiteDatabase, databasePath as defaultDatabasePath } from "./db/sqlite";
import { AdminSecurityService } from "./services/admin-security";
import { AuthRecoveryService } from "./services/auth-recovery";
import { SettingsService } from "./services/settings";

export interface ApiRuntimeOptions {
  databasePath?: string;
  authSecret: string;
  authBaseURL: string;
  trustedOrigins?: string[];
  adminSetupCode?: string;
  adminApiSecret: string;
}

function json(response: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(payload));
  response.setHeader("Cache-Control", "no-store");
  response.end(payload);
}

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function bearer(request: IncomingMessage) {
  const authorization = request.headers.authorization ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function normalizedOrigin(value: string) {
  try { return new URL(value).origin; } catch { return ""; }
}

async function readJson(request: IncomingMessage, limit = 16_384) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > limit) throw new Error("BODY_TOO_LARGE");
    chunks.push(value);
  }
  if (!chunks.length) return {} as Record<string, unknown>;
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_JSON");
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") throw error;
    throw new Error("INVALID_JSON");
  }
}

export function createApiRuntime(options: ApiRuntimeOptions) {
  if (options.adminApiSecret.trim().length < 24) throw new Error("ADMIN_API_SECRET must be at least 24 characters");
  const path = options.databasePath ?? defaultDatabasePath();
  const database = new SQLiteDatabase({ path });
  const settings = new SettingsService(database);
  const security = new AdminSecurityService(database);
  const recovery = new AuthRecoveryService(database);
  const trustedOrigins = [...new Set((options.trustedOrigins ?? []).map(normalizedOrigin).filter(Boolean))];
  const authRuntime = createAuthRuntime({
    databasePath: path,
    secret: options.authSecret,
    baseURL: options.authBaseURL,
    trustedOrigins,
    setupCode: options.adminSetupCode ?? "",
  });
  const authHandler = toNodeHandler(authRuntime.auth);

  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    const host = request.headers.host ?? "127.0.0.1";
    const protocol = request.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const url = new URL(request.url ?? "/", `${protocol}://${host}`);

    if (url.pathname === "/healthz" && request.method === "GET") {
      database.prepare("SELECT 1").get();
      json(response, 200, { ok: true, database: "sqlite" });
      return;
    }

    if (url.pathname === "/admin/setup/status" && request.method === "GET") {
      json(response, 200, security.setupStatus(Date.now(), options.adminSetupCode ?? ""));
      return;
    }

    if (url.pathname === "/admin/recover" && request.method === "POST") {
      if (!safeEqual(bearer(request), options.adminApiSecret)) {
        json(response, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const body = await readJson(request);
        await recovery.recover({
          codeHash: typeof body.codeHash === "string" ? body.codeHash : "",
          newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
        });
        json(response, 200, { ok: true });
      } catch {
        // Do not distinguish unknown codes, expired claims, missing accounts or malformed passwords.
        json(response, 400, { error: "Invalid recovery request" });
      }
      return;
    }

    if (url.pathname === "/machine/runtime" && (request.method === "GET" || request.method === "POST")) {
      if (!safeEqual(bearer(request), options.adminApiSecret)) {
        json(response, 401, { error: "Unauthorized" });
        return;
      }
      json(response, 200, settings.internalRuntime());
      return;
    }

    if (url.pathname === "/machine/runtime") {
      response.setHeader("Allow", "GET, POST");
      json(response, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname.startsWith("/api/auth/")) {
      const origin = typeof request.headers.origin === "string" ? normalizedOrigin(request.headers.origin) : "";
      if (origin && trustedOrigins.includes(origin)) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Vary", "Origin");
      }
      if (request.method === "OPTIONS") {
        if (!origin || !trustedOrigins.includes(origin)) {
          json(response, 403, { error: "Origin not allowed" });
          return;
        }
        response.statusCode = 204;
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Setup-Code, X-Admin-Recovery-Hashes");
        response.end();
        return;
      }
      await authHandler(request, response);
      return;
    }

    json(response, 404, { error: "Not found" });
  };

  return {
    handler,
    database,
    auth: authRuntime.auth,
    close() {
      authRuntime.close();
      database.close();
    },
  };
}

export function apiRuntimeFromEnv() {
  return createApiRuntime({
    authSecret: process.env.BETTER_AUTH_SECRET?.trim() ?? "",
    authBaseURL: process.env.BETTER_AUTH_URL?.trim() || "http://127.0.0.1:8787",
    trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    adminSetupCode: process.env.ADMIN_SETUP_CODE?.trim() ?? "",
    adminApiSecret: process.env.ADMIN_API_SECRET?.trim() ?? "",
  });
}
