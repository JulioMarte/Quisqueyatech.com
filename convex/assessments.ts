import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { AssessmentInterviewEngine } from "../lib/assessment/engine";
import { requireAdmin as requireAdminIdentity } from "./auth";

const serviceArgs = { serviceSecret: v.string() } as const;

function requireService(secret: string) {
  const expected = process.env.ASSESSMENT_STORAGE_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized");
}

export const create = mutation({
  args: { ...serviceArgs, assessmentId: v.string(), firstName: v.string(), lastName: v.string(), company: v.string(), role: v.string(), country: v.string(), locale: v.union(v.literal("es"), v.literal("en")), email: v.string(), phone: v.string(), processingConsent: v.boolean(), recordingConsent: v.boolean(), mode: v.string(), provider: v.optional(v.string()), frameworkVersion: v.optional(v.string()), snapshot: v.optional(v.any()), createdAt: v.number(), audioExpiresAt: v.number(), transcriptExpiresAt: v.number(), leadExpiresAt: v.number(), resumeExpiresAt: v.optional(v.number()), consentVersion: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const existing = await ctx.db.query("assessments").withIndex("by_assessment_id", (q) => q.eq("assessmentId", args.assessmentId)).unique();
    if (existing) return existing._id;
    const leadId = await ctx.db.insert("leads", { assessmentId: args.assessmentId, firstName: args.firstName, lastName: args.lastName, company: args.company, role: args.role, country: args.country, locale: args.locale, email: args.email, phone: args.phone, source: "voice-assessment", status: "assessment_started", processingConsentAt: args.createdAt, leadExpiresAt: args.leadExpiresAt, createdAt: args.createdAt, updatedAt: args.createdAt });
    return ctx.db.insert("assessments", { assessmentId: args.assessmentId, leadId, mode: args.mode, provider: args.provider, frameworkVersion: args.frameworkVersion, snapshot: args.snapshot, stage: args.snapshot?.stage, coverageScore: args.snapshot?.coverageScore || 0, status: "started", reportStatus: "collecting", reportRevision: 0, recordingConsentAt: args.createdAt, consentVersion: args.consentVersion, audioExpiresAt: args.audioExpiresAt, transcriptExpiresAt: args.transcriptExpiresAt, resumeExpiresAt: args.resumeExpiresAt, createdAt: args.createdAt });
  },
});

export const setResumeCredential = mutation({
  args: { ...serviceArgs, assessmentId: v.string(), tokenHash: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const item = await assessmentById(ctx, args.assessmentId);
    await ctx.db.patch(item._id, { resumeTokenHash: args.tokenHash, resumeExpiresAt: args.expiresAt });
  },
});

export const checkRateLimit = mutation({ args: { ...serviceArgs, key: v.string(), limit: v.number(), windowMs: v.number(), now: v.number() }, handler: async (ctx, args) => { requireService(args.serviceSecret); const item = await ctx.db.query("assessmentRateLimits").withIndex("by_key", (q) => q.eq("key", args.key)).unique(); if (!item || item.resetAt <= args.now) { if (item) await ctx.db.patch(item._id, { count: 1, resetAt: args.now + args.windowMs }); else await ctx.db.insert("assessmentRateLimits", { key: args.key, count: 1, resetAt: args.now + args.windowMs }); return true; } if (item.count >= args.limit) return false; await ctx.db.patch(item._id, { count: item.count + 1 }); return true; } });

export const consumeResumeCredential = mutation({
  args: { ...serviceArgs, assessmentId: v.string(), tokenHash: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const item = await assessmentById(ctx, args.assessmentId);
    if (!item.resumeTokenHash || item.resumeTokenHash !== args.tokenHash || !item.resumeExpiresAt || item.resumeExpiresAt <= args.now) return null;
    await ctx.db.patch(item._id, { resumeTokenHash: undefined, resumeExpiresAt: undefined });
    return { ...item, lead: await ctx.db.get(item.leadId) };
  },
});

export const setProviderSession = mutation({
  args: { ...serviceArgs, assessmentId: v.string(), sessionKey: v.string(), provider: v.string(), providerSessionId: v.optional(v.string()), providerModel: v.optional(v.string()), providerVoice: v.optional(v.string()), frameworkVersion: v.string(), startedAt: v.number() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const item = await assessmentById(ctx, args.assessmentId);
    await ctx.db.patch(item._id, { provider: args.provider, providerSessionId: args.providerSessionId, providerModel: args.providerModel, providerVoice: args.providerVoice, frameworkVersion: args.frameworkVersion, status: "in_progress" });
    await ctx.db.insert("assessmentSessions", { sessionKey: args.sessionKey, assessmentId: args.assessmentId, provider: args.provider, providerSessionId: args.providerSessionId, model: args.providerModel, voice: args.providerVoice, frameworkVersion: args.frameworkVersion, status: "active", startedAt: args.startedAt });
  },
});

export const advance = mutation({
  args: { ...serviceArgs, assessmentId: v.string(), sessionKey: v.optional(v.string()), input: v.any(), alerts: v.array(v.any()), now: v.number() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const prior = await ctx.db.query("assessmentEvents").withIndex("by_assessment_event", (q) => q.eq("assessmentId", args.assessmentId).eq("eventId", args.input.eventId)).unique();
    if (prior) return prior.output;
    const item = await assessmentById(ctx, args.assessmentId);
    const output = new AssessmentInterviewEngine().advance(item.snapshot, args.input, args.now);
    output.snapshot.alerts = [...(output.snapshot.alerts || []), ...args.alerts].slice(-50);
    await ctx.db.patch(item._id, { snapshot: output.snapshot, stage: output.snapshot.stage, coverageScore: output.coverageScore, completionReason: args.input.reason, status: output.snapshot.complete ? "interview_complete" : args.input.reason === "interruption" ? "interrupted" : "in_progress", reportStatus: output.snapshot.complete ? "pending_draft" : item.reportStatus });
    const fields = output.snapshot.fields || {};
    const leadPatch: Record<string, unknown> = { updatedAt: args.now };
    if (fields.name?.status === "confirmed") leadPatch.firstName = fields.name.value;
    if (fields.company?.status === "confirmed") leadPatch.company = fields.company.value;
    if (fields.role?.status === "confirmed") leadPatch.role = fields.role.value;
    if (fields.email?.status === "confirmed") leadPatch.email = fields.email.value;
    if (fields.phone?.status === "confirmed") leadPatch.phone = fields.phone.value.replace(/[\s()-]/g, "");
    await ctx.db.patch(item.leadId, leadPatch);
    await ctx.db.insert("assessmentEvents", { assessmentId: args.assessmentId, eventId: args.input.eventId, sessionKey: args.sessionKey, reason: args.input.reason, input: args.input, output, createdAt: args.now });
    return output;
  },
});

export const getState = query({ args: { ...serviceArgs, assessmentId: v.string() }, handler: async (ctx, args) => { requireService(args.serviceSecret); const item = await assessmentByIdOrNull(ctx, args.assessmentId); if (!item) return null; return { ...item, lead: await ctx.db.get(item.leadId) }; } });
export const getByProviderSession = query({ args: { ...serviceArgs, providerSessionId: v.string() }, handler: async (ctx, args) => { requireService(args.serviceSecret); const session = await ctx.db.query("assessmentSessions").withIndex("by_provider_session", (q) => q.eq("providerSessionId", args.providerSessionId)).unique(); if (!session) return null; const item = await assessmentById(ctx, session.assessmentId); return { ...item, session, lead: await ctx.db.get(item.leadId) }; } });
export const storeSessionReport = mutation({ args: { ...serviceArgs, sessionKey: v.string(), transcript: v.string(), report: v.any(), endedAt: v.number(), durationSeconds: v.number(), completionReason: v.string() }, handler: async (ctx, args) => { requireService(args.serviceSecret); const session = await ctx.db.query("assessmentSessions").withIndex("by_session_key", (q) => q.eq("sessionKey", args.sessionKey)).unique(); if (!session) throw new Error("Session not found"); await ctx.db.patch(session._id, { status: "ended", canonicalTranscript: args.transcript, report: args.report, endedAt: args.endedAt, durationSeconds: args.durationSeconds, completionReason: args.completionReason }); return session.assessmentId; } });

export const recordWebhook = mutation({
  args: { ...serviceArgs, eventId: v.string(), provider: v.string(), event: v.string(), payload: v.string(), receivedAt: v.number() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const existing = await ctx.db.query("webhookEvents").withIndex("by_event_id", (q) => q.eq("eventId", args.eventId)).unique();
    if (existing?.status === "processed" || (existing?.status === "processing" && existing.receivedAt > args.receivedAt - 5 * 60_000)) return false;
    if (existing) { await ctx.db.patch(existing._id, { status: "processing", attempts: existing.attempts + 1, error: undefined, receivedAt: args.receivedAt }); return true; }
    await ctx.db.insert("webhookEvents", { eventId: args.eventId, provider: args.provider, event: args.event, payload: args.payload, status: "processing", attempts: 1, receivedAt: args.receivedAt });
    return true;
  },
});
export const finishWebhook = mutation({ args: { ...serviceArgs, eventId: v.string(), success: v.boolean(), error: v.optional(v.string()), now: v.number() }, handler: async (ctx, args) => { requireService(args.serviceSecret); const item = await ctx.db.query("webhookEvents").withIndex("by_event_id", (q) => q.eq("eventId", args.eventId)).unique(); if (item) await ctx.db.patch(item._id, { status: args.success ? "processed" : "failed", error: args.error, processedAt: args.success ? args.now : undefined }); } });

export const claimFinalization = mutation({ args: { ...serviceArgs, assessmentId: v.string(), now: v.number() }, handler: async (ctx, args) => { requireService(args.serviceSecret); const item = await assessmentById(ctx, args.assessmentId); if (item.status === "completed") return false; if (item.status === "finalizing" && item.finalizationStartedAt && item.finalizationStartedAt > args.now - 5 * 60_000) return false; await ctx.db.patch(item._id, { status: "finalizing", finalizationStartedAt: args.now }); return true; } });
export const failFinalization = mutation({ args: { ...serviceArgs, assessmentId: v.string(), error: v.string() }, handler: async (ctx, args) => { requireService(args.serviceSecret); const item = await assessmentById(ctx, args.assessmentId); if (item.status === "finalizing") await ctx.db.patch(item._id, { status: "finalization_failed", completionReason: args.error.slice(0, 500) }); } });
export const complete = mutation({
  args: { ...serviceArgs, assessmentId: v.string(), sessionKey: v.optional(v.string()), transcript: v.string(), provider: v.string(), durationSeconds: v.number(), result: v.any(), completionReason: v.optional(v.string()), completedAt: v.number() },
  handler: async (ctx, args) => {
    requireService(args.serviceSecret);
    const assessment = await assessmentById(ctx, args.assessmentId);
    if (assessment.status === "completed") return false;
    await ctx.db.patch(assessment._id, { transcript: args.transcript, provider: args.provider, durationSeconds: args.durationSeconds, result: args.result, reportDraft: args.result, reportStatus: "review_pending", reportRevision: (assessment.reportRevision || 0) + 1, status: "completed", completionReason: args.completionReason || "completed", completedAt: args.completedAt, finalizationStartedAt: undefined });
    await ctx.db.patch(assessment.leadId, { status: "assessment_completed", updatedAt: args.completedAt });
    if (args.sessionKey) { const session = await ctx.db.query("assessmentSessions").withIndex("by_session_key", (q) => q.eq("sessionKey", args.sessionKey!)).unique(); if (session) await ctx.db.patch(session._id, { status: "ended", endedAt: args.completedAt, durationSeconds: args.durationSeconds, completionReason: args.completionReason || "completed", canonicalTranscript: args.transcript, report: args.result }); }
    await ctx.db.insert("voiceMetrics", { assessmentId: args.assessmentId, provider: args.provider, completion: true, extractionScore: assessment.coverageScore, createdAt: args.completedAt });
    return true;
  },
});

export const adminList = query({ args: { paginationOpts: paginationOptsValidator, reportStatus: v.optional(v.string()) }, handler: async (ctx, args) => { await requireAdminIdentity(ctx); const result = args.reportStatus ? await ctx.db.query("assessments").withIndex("by_report_status", q => q.eq("reportStatus", args.reportStatus)).order("desc").paginate(args.paginationOpts) : await ctx.db.query("assessments").order("desc").paginate(args.paginationOpts); return { ...result, page: await Promise.all(result.page.map(async (item) => { const lead = await ctx.db.get(item.leadId); return { assessmentId: item.assessmentId, status: item.status, reportStatus: item.reportStatus, reportRevision: item.reportRevision ?? 0, stage: item.stage, coverageScore: item.coverageScore, createdAt: item.createdAt, completedAt: item.completedAt, lead: lead ? { firstName: lead.firstName, lastName: lead.lastName, company: lead.company, email: lead.email, locale: lead.locale } : null }; })) }; } });
export const adminGetState = query({ args: { assessmentId: v.string() }, handler: async (ctx, args) => { await requireAdminIdentity(ctx); const item = await assessmentByIdOrNull(ctx, args.assessmentId); if (!item) return null; return { ...item, lead: await ctx.db.get(item.leadId) }; } });
export const adminReview = mutation({ args: { assessmentId: v.string(), reportDraft: v.any(), expectedRevision: v.number() }, handler: async (ctx, args) => { const admin = await requireAdminIdentity(ctx); const item = await assessmentById(ctx, args.assessmentId); if ((item.reportRevision ?? 0) !== args.expectedRevision) throw new Error("CONFLICT: stale assessment revision"); if (item.reportStatus === "sending" && (item.reportSendClaimExpiresAt ?? 0) > Date.now()) throw new Error("CONFLICT: report is sending"); if (item.reportStatus === "sent") throw new Error("CONFLICT: sent reports are immutable"); const now = Date.now(); const revision = args.expectedRevision + 1; await ctx.db.patch(item._id, { reportDraft: args.reportDraft, reportStatus: "review_pending", reviewedBy: admin.email, reviewedAt: now, sendError: undefined, reportRevision: revision }); return { id: item._id, revision }; } });
export const claimReportSend = mutation({ args: { assessmentId: v.string(), reportDraft: v.any(), expectedRevision: v.number(), contentHash: v.string(), claimId: v.string() }, handler: async (ctx, args) => { const admin = await requireAdminIdentity(ctx); const item = await assessmentById(ctx, args.assessmentId); const now = Date.now(); if (item.reportStatus === "sent") throw new Error("CONFLICT: report already sent"); if (item.reportStatus === "sending" && (item.reportSendClaimExpiresAt ?? 0) > now) { if (item.reportContentHash === args.contentHash && item.reportSendKey && item.reportSendClaimId) return { claimId: item.reportSendClaimId, idempotencyKey: item.reportSendKey, revision: item.reportRevision ?? 0 }; throw new Error("CONFLICT: report is sending"); } if ((item.reportRevision ?? 0) !== args.expectedRevision) throw new Error("CONFLICT: stale assessment revision"); const revision = args.expectedRevision + 1; const idempotencyKey = item.reportContentHash === args.contentHash && item.reportSendKey ? item.reportSendKey : `assessment-${item.assessmentId}-${args.contentHash}`; await ctx.db.patch(item._id, { reportDraft: args.reportDraft, reportStatus: "sending", reportRevision: revision, reportContentHash: args.contentHash, reportSendKey: idempotencyKey, reportSendClaimId: args.claimId, reportSendClaimExpiresAt: now + 10 * 60_000, reportSendMessageId: undefined, reviewedBy: admin.email, reviewedAt: now, sendError: undefined }); return { claimId: args.claimId, idempotencyKey, revision }; } });
export const finalizeReportSend = mutation({ args: { assessmentId: v.string(), claimId: v.string(), messageId: v.string() }, handler: async (ctx, args) => { await requireAdminIdentity(ctx); const item = await assessmentById(ctx, args.assessmentId); if (item.reportSendClaimId !== args.claimId || item.reportStatus !== "sending") throw new Error("CONFLICT: send claim does not match"); const now = Date.now(); await ctx.db.patch(item._id, { reportStatus: "sent", sentAt: now, reportSendMessageId: args.messageId, reportSendClaimExpiresAt: undefined, sendError: undefined }); return { sentAt: now, revision: item.reportRevision ?? 0 }; } });
export const failReportSend = mutation({ args: { assessmentId: v.string(), claimId: v.string(), publicError: v.string() }, handler: async (ctx, args) => { await requireAdminIdentity(ctx); const item = await assessmentById(ctx, args.assessmentId); if (item.reportSendClaimId !== args.claimId || item.reportStatus !== "sending") return false; await ctx.db.patch(item._id, { reportStatus: "send_failed", reportSendClaimExpiresAt: undefined, sendError: args.publicError.slice(0, 200) }); return true; } });

export const getDefaultProvider = query({ args: { ...serviceArgs }, handler: async (ctx, args) => { requireService(args.serviceSecret); return (await ctx.db.query("systemSettings").withIndex("by_key", (q) => q.eq("key", "voice.defaultProvider")).unique())?.value || "ultravox"; } });
export const adminGetDefaultProvider = query({ args: {}, handler: async (ctx) => { await requireAdminIdentity(ctx); return (await ctx.db.query("systemSettings").withIndex("by_key", (q) => q.eq("key", "voice.defaultProvider")).unique())?.value || "ultravox"; } });
export const adminSetDefaultProvider = mutation({ args: { provider: v.string() }, handler: async (ctx, args) => { const admin = await requireAdminIdentity(ctx); const now = Date.now(); const item = await ctx.db.query("systemSettings").withIndex("by_key", (q) => q.eq("key", "voice.defaultProvider")).unique(); if (item) await ctx.db.patch(item._id, { value: args.provider, updatedBy: admin.email, updatedAt: now }); else await ctx.db.insert("systemSettings", { key: "voice.defaultProvider", value: args.provider, updatedBy: admin.email, updatedAt: now }); } });

async function assessmentById(ctx: MutationCtx | QueryCtx, assessmentId: string) {
  const item = await assessmentByIdOrNull(ctx, assessmentId);
  if (!item) throw new Error("Assessment not found");
  return item;
}

function assessmentByIdOrNull(ctx: MutationCtx | QueryCtx, assessmentId: string) {
  return ctx.db.query("assessments").withIndex("by_assessment_id", (q) => q.eq("assessmentId", assessmentId)).unique();
}
