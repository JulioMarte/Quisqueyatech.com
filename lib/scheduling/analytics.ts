// Lightweight analytics emitter. We don't import a vendor directly; we
// dispatch a CustomEvent on window so the project can wire it to any
// analytics provider (GA4, Meta Pixel, Plausible, etc.) in one place.
//
// Existing site uses `funnel:track` via Convex on the server side; this
// is the client-side complement for the modal micro-funnel.

import type { Locale } from "@/lib/i18n";

export type ScheduleEvent =
  | { name: "schedule_modal_opened"; locale: Locale; source: string }
  | { name: "schedule_modal_closed"; locale: Locale; step: number; source: string }
  | { name: "schedule_step_advanced"; locale: Locale; step: number; source: string }
  | { name: "schedule_step_regressed"; locale: Locale; step: number; source: string }
  | { name: "schedule_slot_unavailable"; locale: Locale; date: string; source: string }
  | { name: "schedule_booking_succeeded"; locale: Locale; confirmed: boolean; source: string }
  | { name: "schedule_booking_failed"; locale: Locale; code: string; source: string };

declare global {
  interface WindowEventMap {
    "quisqueya:schedule": CustomEvent<ScheduleEvent>;
  }
}

export function trackSchedule(event: ScheduleEvent): void {
  if (typeof window === "undefined") return;
  // 1. CustomEvent for in-app listeners
  window.dispatchEvent(new CustomEvent("quisqueya:schedule", { detail: event }));
  // 2. dataLayer push (Google Tag Manager / GA4 pattern). No-op if undefined.
  const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dl)) {
    dl.push({ event: event.name, ...event });
  }
  // 3. Console debug in dev so the dev can see the funnel.
  if (process.env.NODE_ENV !== "production") {
    console.debug("[schedule]", event.name, event);
  }
}
