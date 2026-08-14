import type { AnalyticsDataAttributes, AnalyticsMeta } from "../types/analytics";

const propertyMap = {
  location: "location",
  label: "label",
  destination: "destination",
  locale: "locale",
  action: "action",
  solution: "solution",
  channel: "channel",
} as const;

export function analyticsAttributes(meta?: AnalyticsMeta): AnalyticsDataAttributes {
  if (!meta) return {};

  const attributes: AnalyticsDataAttributes = {
    "data-analytics-event": meta.event,
  };

  for (const [key, suffix] of Object.entries(propertyMap) as Array<
    [keyof typeof propertyMap, string]
  >) {
    const value = meta[key];
    if (value) attributes[`data-analytics-${suffix}`] = String(value);
  }

  return attributes;
}
