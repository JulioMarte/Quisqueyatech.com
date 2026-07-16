import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const secretItem = v.object({ key: v.string(), ciphertext: v.string(), lastFour: v.string(), version: v.number() });
const allowedSecretKeys = new Set(["ultravoxApiKey", "ultravoxWebhookSecret", "livekitApiKey", "livekitApiSecret", "geminiApiKey", "webhookSecret"]);
const allowedConfigKeys = new Set(["defaultProvider", "ultravoxApiUrl", "ultravoxModel", "ultravoxVoice", "livekitUrl", "geminiLiveModel", "geminiLiveVoice", "webhookEnabled", "webhookUrl"]);

function validatedConfig(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("VALIDATION_ERROR: invalid configuration");
  const config = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(config)) {
    if (!allowedConfigKeys.has(key) || !["string", "boolean", "number", "undefined"].includes(typeof value)) throw new Error("VALIDATION_ERROR: unsupported configuration field");
  }
  return config;
}

export const adminGet = query({ args: {}, handler: async (ctx) => {
  await requireAdmin(ctx);
  const config = await ctx.db.query("systemSettings").withIndex("by_key", q => q.eq("key", "runtime.config")).unique();
  const secrets = await ctx.db.query("secretSettings").take(50);
  return { config: config?.value ?? {}, secrets: Object.fromEntries(secrets.map(item => [item.key, { configured: true, lastFour: item.lastFour, updatedAt: item.updatedAt }])) };
} });
export const adminSave = mutation({ args: { config: v.any(), secrets: v.array(secretItem) }, handler: async (ctx, args) => {
  const admin = await requireAdmin(ctx), now = Date.now();
  const config = validatedConfig(args.config);
  if (args.secrets.some((secret) => !allowedSecretKeys.has(secret.key) || secret.version !== 1 || secret.lastFour.length > 4 || !secret.ciphertext.startsWith("v1."))) throw new Error("VALIDATION_ERROR: invalid secret setting");
  const current = await ctx.db.query("systemSettings").withIndex("by_key", q => q.eq("key", "runtime.config")).unique();
  const previous = current?.value && typeof current.value === "object" ? current.value as Record<string, unknown> : {};
  const changedFields = [...new Set([...Object.keys(previous), ...Object.keys(config)])].filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(config[key])).sort();
  if (current) await ctx.db.patch(current._id, { value: config, updatedBy: admin.email, updatedAt: now }); else await ctx.db.insert("systemSettings", { key: "runtime.config", value: config, updatedBy: admin.email, updatedAt: now });
  for (const secret of args.secrets) { const existing = await ctx.db.query("secretSettings").withIndex("by_key", q => q.eq("key", secret.key)).unique(); const value = { ...secret, updatedBy: admin.email, updatedAt: now }; if (existing) await ctx.db.replace(existing._id, value); else await ctx.db.insert("secretSettings", value); }
  const changedSecretKeys = args.secrets.map((secret) => secret.key).sort();
  if (changedFields.length || changedSecretKeys.length) await ctx.db.insert("configurationAudit", { actorEmail: admin.email, changedFields, changedSecretKeys, createdAt: now });
  return { ok: true };
} });
export const internalRuntime = internalQuery({ args: {}, handler: async (ctx) => {
  const config = await ctx.db.query("systemSettings").withIndex("by_key", q => q.eq("key", "runtime.config")).unique();
  const secrets = await ctx.db.query("secretSettings").take(50);
  return { config: config?.value ?? {}, secrets: Object.fromEntries(secrets.map(item => [item.key, item.ciphertext])) };
} });
export const serviceRuntime = query({ args: { secret: v.string() }, handler: async (ctx, args) => { if (!process.env.ADMIN_API_SECRET || args.secret !== process.env.ADMIN_API_SECRET) throw new Error("Unauthorized"); const config = await ctx.db.query("systemSettings").withIndex("by_key", q => q.eq("key", "runtime.config")).unique(); const secrets = await ctx.db.query("secretSettings").take(50); return { config: config?.value ?? {}, secrets: Object.fromEntries(secrets.map(item => [item.key, item.ciphertext])) }; } });
