import { internalMutation } from "./_generated/server";

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const assessments = await ctx.db.query("assessments").collect();
    const sessions = await ctx.db.query("assessmentSessions").collect();
    const events = await ctx.db.query("assessmentEvents").collect();
    const metrics = await ctx.db.query("voiceMetrics").collect();

    for (const assessment of assessments) {
      if (assessment.audioStorageId && assessment.audioExpiresAt <= now) {
        await ctx.storage.delete(assessment.audioStorageId);
        await ctx.db.patch(assessment._id, { audioStorageId: undefined });
      }
      if (assessment.transcriptExpiresAt <= now) {
        await ctx.db.patch(assessment._id, { transcript: undefined });
        for (const session of sessions.filter((item) => item.assessmentId === assessment.assessmentId && item.canonicalTranscript)) await ctx.db.patch(session._id, { canonicalTranscript: undefined });
      }
      const lead = await ctx.db.get(assessment.leadId);
      if (lead && lead.leadExpiresAt <= now) {
        for (const session of sessions.filter((item) => item.assessmentId === assessment.assessmentId)) await ctx.db.delete(session._id);
        for (const event of events.filter((item) => item.assessmentId === assessment.assessmentId)) await ctx.db.delete(event._id);
        for (const metric of metrics.filter((item) => item.assessmentId === assessment.assessmentId)) await ctx.db.delete(metric._id);
        if (assessment.audioStorageId) await ctx.storage.delete(assessment.audioStorageId);
        await ctx.db.delete(assessment._id);
        await ctx.db.delete(lead._id);
      }
    }

    const webhookCutoff = now - 90 * 24 * 60 * 60_000;
    for (const event of await ctx.db.query("webhookEvents").collect()) if (event.receivedAt <= webhookCutoff) await ctx.db.delete(event._id);
    for (const item of await ctx.db.query("media").withIndex("by_expiry", q => q.gt("expiresAt", 0).lte("expiresAt", now)).take(100)) { await ctx.storage.delete(item.storageId); await ctx.db.delete(item._id); }
    for (const item of await ctx.db.query("apiIdempotency").withIndex("by_expiry", q => q.lte("expiresAt", now)).take(100)) await ctx.db.delete(item._id);
  },
});
