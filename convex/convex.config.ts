import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "@convex-dev/better-auth/convex.config";
import migrations from "@convex-dev/migrations/convex.config.js";

const app = defineApp({
  env: {
    ADMIN_API_SECRET: v.string(),
    ASSESSMENT_STORAGE_SECRET: v.string(),
    ASSESSMENT_WORKER_SECRET: v.optional(v.string()),
    ASSESSMENT_TOKEN_SECRET: v.optional(v.string()),
    AUTH_IP_HASH_SECRET: v.optional(v.string()),
    TURNSTILE_SECRET_KEY: v.optional(v.string()),
    LIVEKIT_URL: v.optional(v.string()),
    LIVEKIT_API_KEY: v.optional(v.string()),
    LIVEKIT_API_SECRET: v.optional(v.string()),
    GEMINI_API_KEY: v.optional(v.string()),
    GEMINI_LIVE_MODEL: v.optional(v.string()),
    GEMINI_LIVE_VOICE: v.optional(v.string()),
    GEMINI_LIVE_TEMPERATURE: v.optional(v.string()),
    ASSESSMENT_REPORT_MODEL: v.optional(v.string()),
    ULTRAVOX_API_URL: v.optional(v.string()),
    ULTRAVOX_API_KEY: v.optional(v.string()),
    ULTRAVOX_MODEL: v.optional(v.string()),
    ULTRAVOX_VOICE: v.optional(v.string()),
    ULTRAVOX_WEBHOOK_SECRET: v.optional(v.string()),
    RESEND_API_KEY: v.optional(v.string()),
    RESEND_FROM_EMAIL: v.optional(v.string()),
    LEAD_TO_EMAIL: v.optional(v.string()),
    TWILIO_ACCOUNT_SID: v.optional(v.string()),
    TWILIO_AUTH_TOKEN: v.optional(v.string()),
    TWILIO_PHONE_NUMBER: v.optional(v.string()),
    EASY_APPOINTMENTS_URL: v.optional(v.string()),
    EASY_APPOINTMENTS_API_TOKEN: v.optional(v.string()),
    EASY_APPOINTMENTS_WEBHOOK_TOKEN: v.optional(v.string()),
    EASY_APPOINTMENTS_PROVIDER_ID: v.optional(v.string()),
    EASY_APPOINTMENTS_SERVICE_ID: v.optional(v.string()),
    EASY_APPOINTMENTS_TIMEZONE: v.optional(v.string()),
  },
});
app.use(betterAuth);
app.use(migrations);

export default app;
