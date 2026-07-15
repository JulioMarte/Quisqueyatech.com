// API client for the scheduling endpoints.
// Uses AbortController so the modal can cancel in-flight requests when
// the user closes mid-flight. All errors are normalized so the modal
// can render a single error component.

import type {
  AvailabilityResponse,
  BookingPayload,
  BookingResult,
  BookingFailureCode,
} from "@/lib/scheduling/types";

export interface FetchAvailabilityOptions {
  signal?: AbortSignal;
}

export async function fetchAvailability(
  date: string,
  timezone: string,
  options: FetchAvailabilityOptions = {},
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({ date, timezone });
  try {
    const response = await fetch(
      `/api/scheduling/availability?${params.toString()}`,
      { signal: options.signal, cache: "no-store" },
    );
    if (!response.ok) {
      return { configured: false, slots: [] };
    }
    const data = (await response.json()) as Partial<AvailabilityResponse>;
    return {
      configured: data.configured !== false,
      slots: Array.isArray(data.slots) ? data.slots : [],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return { configured: false, slots: [] };
  }
}

export interface SubmitBookingOptions {
  signal?: AbortSignal;
  idempotencyKey: string;
}

export async function submitBooking(
  payload: BookingPayload,
  options: SubmitBookingOptions,
): Promise<BookingResult> {
  try {
    const response = await fetch("/api/scheduling/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": options.idempotencyKey,
      },
      body: JSON.stringify({ ...payload, bookingAttemptId: options.idempotencyKey }),
      signal: options.signal,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (response.ok) {
      return {
        ok: true,
        bookingId: typeof data.bookingId === "string" ? data.bookingId : options.idempotencyKey,
        configured: data.configured !== false,
        confirmed: data.confirmed === true,
        status: typeof data.status === "string" ? data.status : "pending_confirmation",
      };
    }

    const code: BookingFailureCode =
      data.code === "slot_unavailable"
        ? "slot_unavailable"
        : response.status === 429
          ? "rate_limited"
          : response.status === 403
            ? "captcha"
            : response.status === 400
              ? "validation"
              : response.status >= 500
                ? "server"
                : "unknown";

    return {
      ok: false,
      code,
      message:
        typeof data.error === "string"
          ? data.error
          : "No pudimos guardar la cita. Intenta de nuevo.",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return {
      ok: false,
      code: "network",
      message: "Sin conexión. Verifica tu internet e intenta de nuevo.",
    };
  }
}
