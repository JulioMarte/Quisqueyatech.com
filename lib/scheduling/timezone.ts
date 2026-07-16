export const DEFAULT_TIME_ZONE = "America/Santo_Domingo";

type TimeZoneResolver = () => string | undefined;

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function detectBrowserTimeZone(
  resolve: TimeZoneResolver = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  try {
    const detected = resolve();
    return isValidTimeZone(detected) ? detected : DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function humanCity(timeZone: string, locale: "es" | "en"): string {
  const segment = timeZone.split("/").at(-1)?.replaceAll("_", " ") || timeZone;
  return segment.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase(locale));
}

function offsetLabel(timeZone: string, instant: Date): string | null {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(instant).find((part) => part.type === "timeZoneName")?.value;
    if (!name || name === "GMT" || name === "UTC") return "UTC";
    const match = name.match(/(?:GMT|UTC)([+-])(\d{2}):?(\d{2})?/);
    if (!match) return null;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? "0");
    const sign = match[1] === "-" ? "−" : "+";
    return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
  } catch {
    return null;
  }
}

export function humanTimeZoneLabel(
  timeZone: string,
  instant: string | number | Date,
  locale: "es" | "en" = "es",
): string {
  if (/^(?:Etc\/)?(?:UTC|GMT)$/i.test(timeZone)) return "UTC";
  const city = humanCity(timeZone, locale);
  if (!isValidTimeZone(timeZone)) return city;
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) return city;
  const offset = offsetLabel(timeZone, date);
  return offset ? `${city} (${offset})` : city;
}
