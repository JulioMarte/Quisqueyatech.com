/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly PUBLIC_LIVEKIT_ASSESSMENT_URL?: string;
  readonly PUBLIC_ASSESSMENT_SCHEDULE_URL?: string;
  readonly PUBLIC_UMAMI_SCRIPT_URL?: string;
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string;
  readonly PUBLIC_UMAMI_DOMAINS?: string;
  readonly PUBLIC_UMAMI_HOST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
