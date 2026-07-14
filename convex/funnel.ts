import { mutation } from "./_generated/server";
import { v } from "convex/values";
export const track = mutation({ args: { sessionId: v.string(), locale: v.union(v.literal("es"), v.literal("en")), name: v.string(), assessmentId: v.optional(v.string()), bookingId: v.optional(v.string()), path: v.optional(v.string()), createdAt: v.number() }, handler: async (ctx, args) => ctx.db.insert("funnelEvents", args) });
