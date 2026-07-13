import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { assessmentId: v.string(), firstName: v.string(), lastName: v.string(), company: v.string(), role: v.string(), country: v.string(), locale: v.union(v.literal("es"), v.literal("en")), email: v.string(), phone: v.string(), processingConsent: v.boolean(), recordingConsent: v.boolean(), mode: v.string(), createdAt: v.number(), audioExpiresAt: v.number(), transcriptExpiresAt: v.number(), leadExpiresAt: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("assessments").withIndex("by_assessment_id", (q) => q.eq("assessmentId", args.assessmentId)).unique();
    if (existing) return existing._id;
    const leadId = await ctx.db.insert("leads", { assessmentId: args.assessmentId, firstName: args.firstName, lastName: args.lastName, company: args.company, role: args.role, country: args.country, locale: args.locale, email: args.email, phone: args.phone, source: "voice-assessment", status: "assessment_started", processingConsentAt: args.createdAt, leadExpiresAt: args.leadExpiresAt, createdAt: args.createdAt, updatedAt: args.createdAt });
    return ctx.db.insert("assessments", { assessmentId: args.assessmentId, leadId, mode: args.mode, status: "started", recordingConsentAt: args.createdAt, audioExpiresAt: args.audioExpiresAt, transcriptExpiresAt: args.transcriptExpiresAt, createdAt: args.createdAt });
  },
});

export const complete = mutation({
  args: { assessmentId: v.string(), transcript: v.string(), provider: v.string(), durationSeconds: v.number(), result: v.any(), completedAt: v.number() },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.query("assessments").withIndex("by_assessment_id", (q) => q.eq("assessmentId", args.assessmentId)).unique();
    if (!assessment) throw new Error("Assessment not found");
    await ctx.db.patch(assessment._id, { transcript: args.transcript, provider: args.provider, durationSeconds: args.durationSeconds, result: args.result, status: "completed", completedAt: args.completedAt });
    await ctx.db.patch(assessment.leadId, { status: "assessment_completed", updatedAt: args.completedAt });
    await ctx.db.insert("voiceMetrics", { assessmentId: args.assessmentId, provider: args.provider, completion: true, createdAt: args.completedAt });
  },
});
