import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/server/auth-server";

const appointmentStatuses = [
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
] as const;
const transitionStatuses = ["cancelled", "completed", "no_show"] as const;
const channels = ["web", "phone"] as const;

export async function GET(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) {
      return adminFailure(trace, "Unauthorized", 401);
    }
    const url = new URL(request.url);
    const bookingId = url.searchParams.get("bookingId")?.trim();
    if (bookingId) {
      if (bookingId.length > 120) {
        return adminFailure(trace, "Invalid appointment id", 400);
      }
      const item = await fetchAuthQuery(api.agenda.adminDetail, { bookingId });
      return item ? adminJson(trace, item) : adminFailure(trace, "Appointment not found", 404);
    }
    const statusValue = url.searchParams.get("status");
    const status = appointmentStatuses.find((value) => value === statusValue);
    if (statusValue && !status) {
      return adminFailure(trace, "Invalid appointment status", 400);
    }
    const channelValue = url.searchParams.get("channel");
    const channel = channels.find((value) => value === channelValue);
    if (channelValue && !channel) {
      return adminFailure(trace, "Invalid appointment channel", 400);
    }
    const fromAt = parseInstant(url.searchParams.get("fromAt"));
    const toAt = parseInstant(url.searchParams.get("toAt"));
    if (
      fromAt === false ||
      toAt === false ||
      (typeof fromAt === "number" && typeof toAt === "number" && fromAt > toAt)
    ) {
      return adminFailure(trace, "Invalid appointment date range", 400);
    }
    const rawLimit = Number(url.searchParams.get("limit") || 30);
    const limit = Number.isInteger(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 30;
    const search = url.searchParams.get("search")?.trim().slice(0, 100);
    const page = await fetchAuthQuery(api.agenda.adminList, {
      paginationOpts: {
        cursor: url.searchParams.get("cursor"),
        numItems: limit,
      },
      status,
      channel,
      fromAt: typeof fromAt === "number" ? fromAt : undefined,
      toAt: typeof toAt === "number" ? toAt : undefined,
      search: search || undefined,
    });
    return adminJson(trace, {
      items: page.page,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    });
  } catch (error) {
    return adminException(trace, "agenda.get", error);
  }
}

export async function PATCH(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) {
      return adminFailure(trace, "Unauthorized", 401);
    }
    const body = await request.json().catch(() => null);
    const status = transitionStatuses.find((value) => value === body?.status);
    if (
      !body ||
      typeof body.bookingId !== "string" ||
      !body.bookingId.trim() ||
      body.bookingId.length > 120 ||
      !status
    ) {
      return adminFailure(trace, "Invalid appointment transition", 400);
    }
    const item = await fetchAuthMutation(api.agenda.adminTransition, {
      bookingId: body.bookingId.trim(),
      status,
    });
    return adminJson(trace, item);
  } catch (error) {
    if (error instanceof Error && error.message.includes("INVALID_STATUS_TRANSITION")) {
      return adminFailure(trace, "Appointment cannot transition from its current status", 409);
    }
    return adminException(trace, "agenda.update", error);
  }
}

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) {
      return adminFailure(trace, "Unauthorized", 401);
    }
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.eventId !== "string" ||
      !body.eventId.trim() ||
      body.eventId.length > 160
    ) {
      return adminFailure(trace, "Invalid webhook event", 400);
    }
    await fetchAuthMutation(api.webhookDelivery.adminRetry, {
      eventId: body.eventId.trim(),
    });
    return adminJson(trace, { ok: true });
  } catch (error) {
    return adminException(trace, "agenda.webhook-retry", error);
  }
}

function parseInstant(value: string | null): number | undefined | false {
  if (!value) return undefined;
  if (!/^\d{1,16}$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : false;
}
