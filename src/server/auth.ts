import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { databasePath as defaultDatabasePath } from "./db/sqlite";

export interface AuthRuntimeOptions {
  databasePath?: string;
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
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

export function createAuthRuntime(options: AuthRuntimeOptions) {
  validateAuthOptions(options);
  const database = new DatabaseSync(options.databasePath ?? defaultDatabasePath(), {
    enableForeignKeyConstraints: true,
    timeout: 5_000,
  });
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = NORMAL");

  const auth = betterAuth({
    database,
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins ?? [],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
    },
    advanced: {
      database: {
        joins: true,
      },
    },
  });

  return {
    auth,
    close() {
      database.close();
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
  return createAuthRuntime({ secret, baseURL, trustedOrigins });
}
