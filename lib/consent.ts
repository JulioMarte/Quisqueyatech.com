import type { Locale } from "@/lib/i18n";

export const MESSAGING_CONSENT_VERSION = "appointment-messaging-2026-07-v1";
export const DATA_PROCESSING_VERSION = "privacy-2026-07-v1";
export const VOICE_CONSENT_VERSION = "voice-assessment-2026-07-v2";
export const MESSAGING_CHANNELS = ["sms", "whatsapp"] as const;

export const consentLinks = {
  privacy: (locale: Locale) => (locale === "es" ? "/privacidad" : "/en/privacy"),
  messagingTerms: (locale: Locale) =>
    locale === "es" ? "/terminos-de-mensajeria" : "/en/messaging-terms",
};
