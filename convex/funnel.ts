import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminApiSecret } from "./lib/security";

const FUNNEL_NAMES = new Set([
  "assessment_started",
  "assessment_completed",
  "assessment_booked",
  "schedule_opened",
  "schedule_slot_selected",
  "lead_captured",
]);

export const track = mutation({
  args: {
    serviceSecret: v.string(),
    sessionId: v.string(),
    locale: v.union(v.literal("es"), v.literal("en")),
    name: v.string(),
    assessmentId: v.optional(v.string()),
    bookingId: v.optional(v.string()),
    path: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    requireAdminApiSecret(args.serviceSecret);
    if (
      !args.sessionId.trim() ||
      args.sessionId.length > 160 ||
      !FUNNEL_NAMES.has(args.name) ||
      (args.path && args.path.length > 500) ||
      (args.assessmentId && args.assessmentId.length > 120) ||
      (args.bookingId && args.bookingId.length > 120)
    ) {
      throw new Error("INVALID_FUNNEL_EVENT");
    }
    const { serviceSecret: _secret, ...event } = args;
    void _secret;
    return ctx.db.insert("funnelEvents", event);
  },
});
