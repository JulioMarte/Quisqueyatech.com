import type { AnalyticsMeta, UmamiDataAttributes } from "../types/analytics";

const propertyMap = {
  location: "location",
  label: "label",
  destination: "destination",
  locale: "locale",
  action: "action",
  solution: "solution",
  channel: "channel",
} as const;

export function analyticsAttributes(meta?: AnalyticsMeta): UmamiDataAttributes {
  if (!meta) return {};

  const attributes: UmamiDataAttributes = {
    "data-umami-event": meta.event,
  };

  for (const [key, suffix] of Object.entries(propertyMap) as Array<
    [keyof typeof propertyMap, string]
  >) {
    const value = meta[key];
    if (value) attributes[`data-umami-event-${suffix}`] = String(value);
  }

  return attributes;
}
