function numberValue(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Server-only configuration sourced from the current Convex deployment. */
export function runtimeEnvironment() {
  return {
    defaultProvider: "livekit",
    livekitUrl: process.env.LIVEKIT_URL,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiLiveModel: process.env.GEMINI_LIVE_MODEL,
    geminiLiveVoice: process.env.GEMINI_LIVE_VOICE,
    geminiLiveTemperature: numberValue(process.env.GEMINI_LIVE_TEMPERATURE),
    assessmentReportModel: process.env.ASSESSMENT_REPORT_MODEL,
    ultravoxApiUrl: process.env.ULTRAVOX_API_URL,
    ultravoxApiKey: process.env.ULTRAVOX_API_KEY,
    ultravoxModel: process.env.ULTRAVOX_MODEL,
    ultravoxVoice: process.env.ULTRAVOX_VOICE,
    ultravoxWebhookSecret: process.env.ULTRAVOX_WEBHOOK_SECRET,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
    assessmentTokenSecret: process.env.ASSESSMENT_TOKEN_SECRET,
    assessmentStorageSecret: process.env.ASSESSMENT_STORAGE_SECRET,
    assessmentWorkerSecret: process.env.ASSESSMENT_WORKER_SECRET,
    authIpHashSecret: process.env.AUTH_IP_HASH_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFromEmail: process.env.RESEND_FROM_EMAIL,
    leadToEmail: process.env.LEAD_TO_EMAIL,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
    easyAppointmentsUrl: process.env.EASY_APPOINTMENTS_URL,
    easyAppointmentsApiToken: process.env.EASY_APPOINTMENTS_API_TOKEN,
    easyAppointmentsWebhookToken: process.env.EASY_APPOINTMENTS_WEBHOOK_TOKEN,
    easyAppointmentsProviderId: process.env.EASY_APPOINTMENTS_PROVIDER_ID,
    easyAppointmentsServiceId: process.env.EASY_APPOINTMENTS_SERVICE_ID,
    easyAppointmentsTimezone: process.env.EASY_APPOINTMENTS_TIMEZONE,
  };
}

export function workerEnvironment() {
  const runtime = runtimeEnvironment();
  return {
    livekitUrl: runtime.livekitUrl,
    livekitApiKey: runtime.livekitApiKey,
    livekitApiSecret: runtime.livekitApiSecret,
    geminiApiKey: runtime.geminiApiKey,
    geminiLiveModel: runtime.geminiLiveModel,
    geminiLiveVoice: runtime.geminiLiveVoice,
    geminiLiveTemperature: runtime.geminiLiveTemperature,
  };
}
