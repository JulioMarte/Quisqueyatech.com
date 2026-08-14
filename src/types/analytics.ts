export type AnalyticsEventName =
  | "cta_click"
  | "nav_click"
  | "solution_click"
  | "assessment_start"
  | "assessment_schedule"
  | "livekit_open"
  | "scheduler_open"
  | "language_change"
  | "resource_click"
  | "about_click"
  | "social_click"
  | "email_click"
  | "phone_click"
  | "file_download"
  | "form_submit"
  | "outbound_click"
  | "privacy_click"
  | "menu_toggle"
  | "ui_click";

export type AnalyticsLocation =
  | "hero"
  | "navbar"
  | "mobile_nav"
  | "mega_menu"
  | "solutions"
  | "assessment"
  | "process"
  | "founder"
  | "resources"
  | "final_cta"
  | "footer"
  | "privacy"
  | "page"
  | "unknown";

export interface AnalyticsMeta {
  event: AnalyticsEventName;
  location: AnalyticsLocation;
  label?: string;
  destination?: string;
  locale?: "es" | "en";
  action?: string;
  solution?: string;
  channel?: string;
}

export type AnalyticsDataAttributes = Record<`data-analytics-${string}`, string>;
