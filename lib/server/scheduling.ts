import "server-only";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { BookingInput } from "@/lib/validations/assessment";

export type AvailableSlot = { start: string; label: string };
export interface SchedulingProvider {
  listAvailability(date: string, timezone: string): Promise<AvailableSlot[]>;
  book(input: BookingInput): Promise<{ externalId: string; status: string }>;
}

export class SchedulingError extends Error {
  constructor(message: string, public status: number, public retryable = false) { super(message); }
}

function config() {
  const baseUrl = process.env.EASY_APPOINTMENTS_URL?.replace(/\/$/, "");
  const token = process.env.EASY_APPOINTMENTS_API_TOKEN;
  const providerId = process.env.EASY_APPOINTMENTS_PROVIDER_ID;
  const serviceId = process.env.EASY_APPOINTMENTS_SERVICE_ID;
  const timezone = process.env.EASY_APPOINTMENTS_TIMEZONE || "America/Santo_Domingo";
  if (!baseUrl || !token || !providerId || !serviceId) return null;
  return { baseUrl, token, providerId, serviceId, timezone };
}

export function easyAppointmentsConfigured() { return config() !== null; }

async function easyFetch(url: string, init?: RequestInit) {
  const c = config();
  if (!c) throw new SchedulingError("Easy!Appointments is not configured", 503, true);
  let response: Response;
  try { response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${c.token}`, Accept: "application/json", ...init?.headers }, cache: "no-store", signal: AbortSignal.timeout(10_000) }); }
  catch { throw new SchedulingError("The scheduling service did not respond", 503, true); }
  if (!response.ok) throw new SchedulingError(response.status === 409 || response.status === 422 ? "That time is no longer available" : `Easy!Appointments request failed (${response.status})`, response.status, response.status >= 500);
  return response;
}

export class EasyAppointmentsProvider implements SchedulingProvider {
  async listAvailability(date: string, timezone: string): Promise<AvailableSlot[]> {
    const c = config();
    if (!c) return [];
    const url = new URL(`${c.baseUrl}/index.php/api/v1/availabilities`);
    url.searchParams.set("providerId", c.providerId); url.searchParams.set("serviceId", c.serviceId); url.searchParams.set("date", date);
    const response = await easyFetch(url.toString());
    const times = (await response.json()) as string[];
    return times.map((time) => { const start = fromZonedTime(`${date} ${time}`, c.timezone); return { start: start.toISOString(), label: formatInTimeZone(start, timezone, "h:mm a") }; });
  }

  async book(input: BookingInput) {
    const c = config();
    if (!c) throw new SchedulingError("Easy!Appointments is not configured", 503, true);
    const start = new Date(input.start);
    const localDate = formatInTimeZone(start, c.timezone, "yyyy-MM-dd");
    const available = await this.listAvailability(localDate, input.timezone);
    if (!available.some((slot) => slot.start === start.toISOString())) throw new SchedulingError("That time is no longer available", 409);
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    const payload = { start: formatInTimeZone(start, c.timezone, "yyyy-MM-dd HH:mm:ss"), end: formatInTimeZone(end, c.timezone, "yyyy-MM-dd HH:mm:ss"), location: input.channel === "phone" ? "Phone" : "QuisqueyaTech voice assessment", notes: JSON.stringify({ channel: input.channel, timezone: input.timezone, locale: input.locale, bookingAttemptId: input.bookingAttemptId }), serviceId: Number(c.serviceId), providerId: Number(c.providerId), customer: { firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone, timezone: input.timezone, language: input.locale === "es" ? "spanish" : "english" } };
    const response = await easyFetch(`${c.baseUrl}/index.php/api/v1/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = (await response.json()) as { id: number | string };
    return { externalId: String(result.id), status: "confirmed" };
  }
}
