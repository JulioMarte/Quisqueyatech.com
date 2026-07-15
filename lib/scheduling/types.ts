// Scheduling modal types
// These mirror lib/validations/assessment.ts (bookingSchema) and the
// /api/scheduling/* endpoints. Kept narrow on purpose: only what the modal
// needs to display, validate and submit.

import type { Locale } from "@/lib/i18n";

export type ScheduleChannel = "web" | "phone";

export interface ScheduleSlot {
  /** ISO 8601 datetime in UTC. */
  start: string;
  /** Human label e.g. "10:00 AM" already localized by the server. */
  label: string;
}

export interface AvailabilityResponse {
  configured: boolean;
  slots: ScheduleSlot[];
}

export interface BookingPayload {
  firstName: string;
  lastName: string;
  company?: string;
  role?: string;
  country: string;
  email?: string;
  phone: string;
  notes?: string;
  locale: Locale;
  start: string;
  timezone: string;
  channel: ScheduleChannel;
  processingConsent: true;
  recordingConsent: boolean;
  turnstileToken?: string;
  bookingAttemptId: string;
}

export type BookingFailureCode =
  | "validation"
  | "captcha"
  | "slot_unavailable"
  | "rate_limited"
  | "network"
  | "server"
  | "unknown";

export interface BookingSuccess {
  ok: true;
  bookingId: string;
  configured: boolean;
  confirmed: boolean;
  status: string;
}

export interface BookingFailure {
  ok: false;
  code: BookingFailureCode;
  message: string;
}

export type BookingResult = BookingSuccess | BookingFailure;

export const COUNTRIES: ReadonlyArray<{ code: string; es: string; en: string; dial?: string }> = [
  { code: "DO", es: "República Dominicana", en: "Dominican Republic", dial: "+1" },
  { code: "PR", es: "Puerto Rico", en: "Puerto Rico", dial: "+1" },
  { code: "US", es: "Estados Unidos", en: "United States", dial: "+1" },
  { code: "CO", es: "Colombia", en: "Colombia", dial: "+57" },
  { code: "MX", es: "México", en: "Mexico", dial: "+52" },
  { code: "PA", es: "Panamá", en: "Panama", dial: "+507" },
  { code: "ES", es: "España", en: "Spain", dial: "+34" },
  { code: "AR", es: "Argentina", en: "Argentina", dial: "+54" },
  { code: "CL", es: "Chile", en: "Chile", dial: "+56" },
  { code: "PE", es: "Perú", en: "Peru", dial: "+51" },
  { code: "OTHER", es: "Otro", en: "Other" },
] as const;

export function countryName(code: string, locale: Locale): string {
  const c = COUNTRIES.find((x) => x.code === code);
  if (!c) return code;
  return locale === "en" ? c.en : c.es;
}

export function dialForCountry(code: string): string | undefined {
  return COUNTRIES.find((x) => x.code === code)?.dial;
}

/** Loose E.164-ish regex used for client-side feedback only.
 *  The server applies the canonical validation. */
export const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;
