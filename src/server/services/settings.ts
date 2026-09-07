import { randomUUID } from "node:crypto";
import type { SQLiteDatabase } from "../db/sqlite";

const ALLOWED_SECRET_KEYS = new Set([
  "ultravoxApiKey",
  "ultravoxWebhookSecret",
  "livekitApiKey",
  "livekitApiSecret",
  "geminiApiKey",
  "webhookSecret",
]);

const ALLOWED_CONFIG_KEYS = new Set([
  "defaultProvider",
  "ultravoxApiUrl",
  "ultravoxModel",
  "ultravoxVoice",
  "livekitUrl",
  "geminiLiveModel",
  "geminiLiveVoice",
  "webhookEnabled",
  "webhookUrl",
]);

export type RuntimeConfig = Partial<Record<
  | "defaultProvider"
  | "ultravoxApiUrl"
  | "ultravoxModel"
  | "ultravoxVoice"
  | "livekitUrl"
  | "geminiLiveModel"
  | "geminiLiveVoice"
  | "webhookEnabled"
  | "webhookUrl",
  string | boolean | number
>>;

export interface SecretInput {
  key: string;
  ciphertext: string;
  lastFour: string;
  version: number;
}

interface SystemSettingRow {
  id: string;
  key: string;
  value: string;
  updatedBy: string;
  updatedAt: number;
}

interface SecretRow {
  id: string;
  key: string;
  ciphertext: string;
  lastFour: string;
  version: number;
  updatedBy: string;
  updatedAt: number;
}

function validateConfig(input: unknown): RuntimeConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("VALIDATION_ERROR: invalid configuration");
  }
  const config = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(config)) {
    if (!ALLOWED_CONFIG_KEYS.has(key) || !["string", "boolean", "number", "undefined"].includes(typeof value)) {
      throw new Error("VALIDATION_ERROR: unsupported configuration field");
    }
  }
  return config as RuntimeConfig;
}

function validateSecret(secret: SecretInput) {
  if (
    !ALLOWED_SECRET_KEYS.has(secret.key) ||
    secret.version !== 1 ||
    secret.lastFour.length > 4 ||
    !secret.ciphertext.startsWith("v1.")
  ) throw new Error("VALIDATION_ERROR: invalid secret setting");
}

export class SettingsService {
  constructor(private readonly database: SQLiteDatabase) {}

  adminGet() {
    const configRow = this.database.prepare("SELECT * FROM systemSettings WHERE key='runtime.config' LIMIT 1").get() as SystemSettingRow | undefined;
    const secrets = this.database.prepare("SELECT key,lastFour,updatedAt FROM secretSettings ORDER BY key").all() as Array<Pick<SecretRow, "key" | "lastFour" | "updatedAt">>;
    return {
      config: configRow ? JSON.parse(configRow.value) as RuntimeConfig : {},
      secrets: Object.fromEntries(secrets.map((item) => [item.key, {
        configured: true,
        lastFour: item.lastFour,
        updatedAt: item.updatedAt,
      }])),
    };
  }

  internalRuntime() {
    const configRow = this.database.prepare("SELECT * FROM systemSettings WHERE key='runtime.config' LIMIT 1").get() as SystemSettingRow | undefined;
    const secrets = this.database.prepare("SELECT key,ciphertext FROM secretSettings ORDER BY key").all() as Array<Pick<SecretRow, "key" | "ciphertext">>;
    return {
      config: configRow ? JSON.parse(configRow.value) as RuntimeConfig : {},
      secrets: Object.fromEntries(secrets.map((item) => [item.key, item.ciphertext])),
    };
  }

  save(input: { config: unknown; secrets: SecretInput[]; actorEmail: string; now?: number }) {
    const now = input.now ?? Date.now();
    const actorEmail = input.actorEmail.trim();
    if (!actorEmail || actorEmail.length > 160) throw new Error("VALIDATION_ERROR: invalid actor");
    const config = validateConfig(input.config);
    input.secrets.forEach(validateSecret);

    return this.database.transaction(() => {
      const current = this.database.prepare("SELECT * FROM systemSettings WHERE key='runtime.config' LIMIT 1").get() as SystemSettingRow | undefined;
      const previous = current ? JSON.parse(current.value) as Record<string, unknown> : {};
      const changedFields = [...new Set([...Object.keys(previous), ...Object.keys(config)])]
        .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(config[key]))
        .sort();

      if (current) {
        this.database.prepare("UPDATE systemSettings SET value=?,updatedBy=?,updatedAt=? WHERE id=?").run(
          JSON.stringify(config), actorEmail, now, current.id,
        );
      } else {
        this.database.prepare("INSERT INTO systemSettings(id,key,value,updatedBy,updatedAt) VALUES (?,'runtime.config',?,?,?)").run(
          randomUUID(), JSON.stringify(config), actorEmail, now,
        );
      }

      for (const secret of input.secrets) {
        const existing = this.database.prepare("SELECT id FROM secretSettings WHERE key=? LIMIT 1").get(secret.key) as { id: string } | undefined;
        if (existing) {
          this.database.prepare(`
            UPDATE secretSettings SET ciphertext=?,lastFour=?,version=?,updatedBy=?,updatedAt=? WHERE id=?
          `).run(secret.ciphertext, secret.lastFour, secret.version, actorEmail, now, existing.id);
        } else {
          this.database.prepare(`
            INSERT INTO secretSettings(id,key,ciphertext,lastFour,version,updatedBy,updatedAt)
            VALUES (?,?,?,?,?,?,?)
          `).run(randomUUID(), secret.key, secret.ciphertext, secret.lastFour, secret.version, actorEmail, now);
        }
      }

      const changedSecretKeys = input.secrets.map((secret) => secret.key).sort();
      if (changedFields.length || changedSecretKeys.length) {
        this.database.prepare(`
          INSERT INTO configurationAudit(id,actorEmail,changedFields,changedSecretKeys,createdAt)
          VALUES (?,?,?,?,?)
        `).run(randomUUID(), actorEmail, JSON.stringify(changedFields), JSON.stringify(changedSecretKeys), now);
      }
      return { ok: true, changedFields, changedSecretKeys };
    });
  }
}
