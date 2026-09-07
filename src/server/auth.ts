import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { SQLiteDatabase, databasePath as defaultDatabasePath } from "./db/sqlite";
import { AdminSecurityService } from "./services/admin-security";

export interface AuthRuntimeOptions {
  databasePath?: string;
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
  setupCode?: string;
}

function validateAuthOptions(options: AuthRuntimeOptions) {
  if (options.secret.trim().length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  const baseURL = new URL(options.baseURL);
  if (!/^https?:$/.test(baseURL.protocol)) throw new Error("BETTER_AUTH_URL must use http or https");
  for (const origin of options.trustedOrigins ?? []) {
    const url = new URL(origin);
    if (!/^https?:$/.test(url.protocol) || url.origin !== origin.replace(/\/$/, "")) {
      throw new Error(`Invalid trusted auth origin: ${origin}`);
    }
  }
}

function header(context: { headers?: Headers } | null | undefined, name: string) {
  return context?.headers?.get(name) ?? "";
}

export function createAuthRuntime(options: AuthRuntimeOptions) {
  validateAuthOptions(options);
  const path = options.databasePath ?? defaultDatabasePath();

  // QuisqueyaTech-owned tables and Better Auth-owned tables intentionally share one file,
  // but use separate connections. This prevents nested transactions inside Better Auth hooks.
  const applicationDatabase = new SQLiteDatabase({ path });
  const adminSecurity = new AdminSecurityService(applicationDatabase);
  const authDatabase = new DatabaseSync(path, {
    enableForeignKeyConstraints: true,
    timeout: 5_000,
  });
  authDatabase.exec("PRAGMA foreign_keys = ON");
  authDatabase.exec("PRAGMA busy_timeout = 5000");
  authDatabase.exec("PRAGMA journal_mode = WAL");
  authDatabase.exec("PRAGMA synchronous = NORMAL");

  const auth = betterAuth({
    database: authDatabase,
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins ?? [],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 14,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    // Unlike the old Convex catch-all, the replacement API server will expose Better Auth
    // directly. Keep Better Auth's own limiter enabled in addition to app-level setup/recovery gates.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (_user, context) => {
            const result = adminSecurity.claimSetup(
              header(context, "x-admin-setup-code"),
              Date.now(),
              options.setupCode ?? "",
            );
            if (!result.ok) throw new APIError("FORBIDDEN", { message: "Setup unavailable" });
          },
          after: async (user, context) => {
            let recoveryHashes: string[] = [];
            try {
              const parsed = JSON.parse(header(context, "x-admin-recovery-hashes"));
              if (Array.isArray(parsed)) recoveryHashes = parsed.filter((value): value is string => typeof value === "string");
            } catch {
              // finalizeSetup rejects invalid/missing recovery hashes atomically.
            }
            adminSecurity.finalizeSetup({
              userId: user.id,
              email: user.email,
              name: user.name,
              recoveryHashes,
              now: Date.now(),
            });
          },
        },
      },
    },
    advanced: {
      database: {
        joins: true,
      },
    },
  });

  return {
    auth,
    adminSecurity,
    close() {
      authDatabase.close();
      applicationDatabase.close();
    },
  };
}

export function authRuntimeFromEnv() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? "";
  const baseURL = process.env.BETTER_AUTH_URL?.trim() || "http://127.0.0.1:8787";
  const trustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return createAuthRuntime({
    secret,
    baseURL,
    trustedOrigins,
    setupCode: process.env.ADMIN_SETUP_CODE?.trim() ?? "",
  });
}
