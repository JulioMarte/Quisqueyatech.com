import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { internalQuery } from "./_generated/server";
import type { Infer } from "convex/values";
import {
  assessmentReportValidator,
  assessmentSnapshotValidator,
  progressInputValidator,
  progressOutputValidator,
} from "./assessmentValidators";

export const migrations = new Migrations<DataModel>(components.migrations);

// Widened-schema migration: existing media is permanent only when a post
// actually references its storage object. Everything else receives a grace
// period before retention can remove it.
export const classifyExistingMedia = migrations.define({
  table: "media",
  batchSize: 25,
  migrateOne: async (ctx, media) => {
    if (media.lifecycle) return;
    const post = await ctx.db
      .query("posts")
      .withIndex("by_image_id", (q) => q.eq("imageId", media.storageId))
      .first();
    return post
      ? { lifecycle: "permanent" as const, associatedPostId: post._id, expiresAt: undefined }
      : { lifecycle: "orphaned" as const, expiresAt: Date.now() + 7 * 24 * 60 * 60_000 };
  },
});

// Widened-schema backfill for appointments created before the internal agenda.
// externalId remains untouched as historical Easy!Appointments metadata.
export const normalizeExistingBookings = migrations.define({
  table: "bookings",
  batchSize: 50,
  migrateOne: async (_ctx, booking) => {
    if (booking.end) return;
    const start = Date.parse(booking.start);
    if (!Number.isFinite(start)) return;
    return { end: new Date(start + 15 * 60_000).toISOString() };
  },
});

// Deploy after the widened schema. New writes already populate these fields,
// so the online migration only needs to backfill historical appointments.
export const backfillBookingTimestamps = migrations.define({
  table: "bookings",
  batchSize: 50,
  migrateOne: async (_ctx, booking) => {
    if (booking.startAt !== undefined && booking.endAt !== undefined) return;
    const startAt = Date.parse(booking.start);
    const endAt = booking.end ? Date.parse(booking.end) : startAt + 15 * 60_000;
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
      throw new Error(`Invalid ISO date in booking ${booking.bookingId}`);
    }
    const previousStartAt = booking.previousStart ? Date.parse(booking.previousStart) : undefined;
    if (booking.previousStart && !Number.isFinite(previousStartAt))
      throw new Error(`Invalid previousStart in booking ${booking.bookingId}`);
    return { startAt, endAt, previousStartAt };
  },
});

export const backfillBookingSearchText = migrations.define({
  table: "bookings",
  batchSize: 50,
  migrateOne: async (ctx, booking) => {
    if (booking.searchText) return;
    const lead = await ctx.db.get(booking.leadId);
    const searchText = [
      booking.bookingId,
      lead?.firstName,
      lead?.lastName,
      lead?.company,
      lead?.email,
      lead?.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return { searchText };
  },
});

type SnapshotV1 = Infer<typeof assessmentSnapshotValidator>;
type ReportV1 = Infer<typeof assessmentReportValidator>;
type ProgressInputV1 = Infer<typeof progressInputValidator>;
type ProgressOutputV1 = Infer<typeof progressOutputValidator>;

// Deploy 1 of the assessment contract migration. New writes dual-write legacy
// and V1 fields; these migrations copy only documents that satisfy the V1
// contract. verifyAssessmentV1Migration must report complete before narrowing.
export const backfillAssessmentV1 = migrations.define({
  table: "assessments",
  batchSize: 25,
  migrateOne: async (_ctx, assessment) => {
    const patch: {
      snapshotV1?: SnapshotV1;
      reportDraftV1?: ReportV1;
      resultV1?: ReportV1;
    } = {};
    if (!assessment.snapshotV1 && isSnapshotV1(assessment.snapshot))
      patch.snapshotV1 = assessment.snapshot;
    if (!assessment.reportDraftV1 && isReportV1(assessment.reportDraft))
      patch.reportDraftV1 = assessment.reportDraft;
    if (!assessment.resultV1 && isReportV1(assessment.result)) patch.resultV1 = assessment.result;
    return Object.keys(patch).length ? patch : undefined;
  },
});

export const backfillAssessmentSessionV1 = migrations.define({
  table: "assessmentSessions",
  batchSize: 25,
  migrateOne: async (_ctx, session) =>
    !session.reportV1 && isReportV1(session.report) ? { reportV1: session.report } : undefined,
});

export const backfillAssessmentEventV1 = migrations.define({
  table: "assessmentEvents",
  batchSize: 25,
  migrateOne: async (_ctx, event) => {
    if (event.inputV1 && event.outputV1) return;
    if (!isProgressInputV1(event.input) || !isProgressOutputV1(event.output)) return;
    return { inputV1: event.input, outputV1: event.output };
  },
});

export const verifyAssessmentV1Migration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const assessments = await ctx.db.query("assessments").take(1_000);
    const sessions = await ctx.db.query("assessmentSessions").take(1_000);
    const events = await ctx.db.query("assessmentEvents").take(1_000);
    const missing = [
      ...assessments
        .filter(
          (row) =>
            (row.snapshot !== undefined && !row.snapshotV1) ||
            (row.reportDraft !== undefined && !row.reportDraftV1) ||
            (row.result !== undefined && !row.resultV1),
        )
        .map((row) => `assessments:${row._id}`),
      ...sessions
        .filter((row) => row.report !== undefined && !row.reportV1)
        .map((row) => `assessmentSessions:${row._id}`),
      ...events
        .filter((row) => !row.inputV1 || !row.outputV1)
        .map((row) => `assessmentEvents:${row._id}`),
    ].slice(0, 20);
    const capped =
      assessments.length === 1_000 || sessions.length === 1_000 || events.length === 1_000;
    return {
      complete: missing.length === 0 && !capped,
      sampleMissing: missing,
      inspected: {
        assessments: assessments.length,
        sessions: sessions.length,
        events: events.length,
      },
      capped,
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSnapshotV1(value: unknown): value is SnapshotV1 {
  if (!isRecord(value) || value.version !== 1) return false;
  return (
    typeof value.revision === "number" &&
    (value.locale === "es" || value.locale === "en") &&
    typeof value.stage === "string" &&
    isRecord(value.fields) &&
    isRecord(value.probeCounts) &&
    typeof value.coverageScore === "number" &&
    Array.isArray(value.essentialMissing) &&
    typeof value.currentBranch === "string" &&
    typeof value.elapsedSeconds === "number" &&
    typeof value.complete === "boolean" &&
    Array.isArray(value.alerts) &&
    typeof value.lastUpdatedAt === "number"
  );
}

function isReportV1(value: unknown): value is ReportV1 {
  if (!isRecord(value)) return false;
  return (
    typeof value.subject === "string" &&
    typeof value.executiveSummary === "string" &&
    typeof value.processSummary === "string" &&
    Array.isArray(value.opportunities) &&
    Array.isArray(value.assumptions) &&
    Array.isArray(value.openQuestions) &&
    typeof value.nextStep === "string"
  );
}

function isProgressInputV1(value: unknown): value is ProgressInputV1 {
  return (
    isRecord(value) &&
    typeof value.assessmentId === "string" &&
    typeof value.eventId === "string" &&
    typeof value.reason === "string" &&
    typeof value.elapsedSeconds === "number"
  );
}

function isProgressOutputV1(value: unknown): value is ProgressOutputV1 {
  return (
    isRecord(value) &&
    isSnapshotV1(value.snapshot) &&
    typeof value.coverageScore === "number" &&
    Array.isArray(value.essentialMissing) &&
    typeof value.currentBranch === "string" &&
    typeof value.nextInstruction === "string" &&
    typeof value.suggestedAction === "string"
  );
}

export const run = migrations.runner();
