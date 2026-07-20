import { internalMutation } from "./_generated/server";

const BATCH = 40;

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deletedLeads = 0;
    let scrubbedAudio = 0;
    let scrubbedTranscripts = 0;
    let deletedWebhooks = 0;
    let deletedMedia = 0;
    let deletedIdempotency = 0;
    let deletedTelemetry = 0;

    for (const event of await ctx.db
      .query("assessmentTelemetry")
      .withIndex("by_expires_at", (q) => q.lte("expiresAt", now))
      .take(BATCH)) {
      await ctx.db.delete(event._id);
      deletedTelemetry += 1;
    }

    // Audio scrub: indexed expiry, bounded batch.
    for (const assessment of await ctx.db
      .query("assessments")
      .withIndex("by_audio_expiry", (q) => q.lte("audioExpiresAt", now))
      .take(BATCH)) {
      if (assessment.audioStorageId) {
        await ctx.storage.delete(assessment.audioStorageId);
        await ctx.db.patch(assessment._id, { audioStorageId: undefined });
        scrubbedAudio += 1;
      }
    }

    // Transcript scrub: indexed expiry, bounded batch.
    for (const assessment of await ctx.db
      .query("assessments")
      .withIndex("by_transcript_expiry", (q) => q.lte("transcriptExpiresAt", now))
      .take(BATCH)) {
      if (assessment.transcript) {
        await ctx.db.patch(assessment._id, { transcript: undefined });
        scrubbedTranscripts += 1;
      }
      const sessions = await ctx.db
        .query("assessmentSessions")
        .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment.assessmentId))
        .take(20);
      for (const session of sessions) {
        if (session.canonicalTranscript) {
          await ctx.db.patch(session._id, { canonicalTranscript: undefined });
        }
      }
    }

    // Full lead/assessment retention: delete expired leads and related rows.
    for (const lead of await ctx.db
      .query("leads")
      .withIndex("by_lead_expires", (q) => q.lte("leadExpiresAt", now))
      .take(BATCH)) {
      if (lead.assessmentId) {
        const assessment = await ctx.db
          .query("assessments")
          .withIndex("by_assessment_id", (q) => q.eq("assessmentId", lead.assessmentId!))
          .unique();
        if (assessment) {
          for (const session of await ctx.db
            .query("assessmentSessions")
            .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment.assessmentId))
            .take(50)) {
            await ctx.db.delete(session._id);
          }
          for (const event of await ctx.db
            .query("assessmentEvents")
            .withIndex("by_assessment_time", (q) => q.eq("assessmentId", assessment.assessmentId))
            .take(100)) {
            await ctx.db.delete(event._id);
          }
          for (const metric of await ctx.db
            .query("voiceMetrics")
            .withIndex("by_assessment", (q) => q.eq("assessmentId", assessment.assessmentId))
            .take(20)) {
            await ctx.db.delete(metric._id);
          }
          for (const event of await ctx.db
            .query("assessmentTelemetry")
            .withIndex("by_assessment_id_and_created_at", (q) =>
              q.eq("assessmentId", assessment.assessmentId),
            )
            .take(200)) {
            await ctx.db.delete(event._id);
          }
          if (assessment.audioStorageId) await ctx.storage.delete(assessment.audioStorageId);
          await ctx.db.delete(assessment._id);
        }
      }
      await ctx.db.delete(lead._id);
      deletedLeads += 1;
    }

    const webhookCutoff = now - 90 * 24 * 60 * 60_000;
    for (const event of await ctx.db
      .query("webhookEvents")
      .withIndex("by_received_at", (q) => q.lte("receivedAt", webhookCutoff))
      .take(BATCH)) {
      await ctx.db.delete(event._id);
      deletedWebhooks += 1;
    }

    for (const item of await ctx.db
      .query("media")
      .withIndex("by_expiry", (q) => q.gt("expiresAt", 0).lte("expiresAt", now))
      .take(BATCH)) {
      await ctx.storage.delete(item.storageId);
      await ctx.db.delete(item._id);
      deletedMedia += 1;
    }

    for (const item of await ctx.db
      .query("apiIdempotency")
      .withIndex("by_expiry", (q) => q.lte("expiresAt", now))
      .take(BATCH)) {
      await ctx.db.delete(item._id);
      deletedIdempotency += 1;
    }

    return {
      deletedLeads,
      scrubbedAudio,
      scrubbedTranscripts,
      deletedWebhooks,
      deletedMedia,
      deletedIdempotency,
      deletedTelemetry,
    };
  },
});
