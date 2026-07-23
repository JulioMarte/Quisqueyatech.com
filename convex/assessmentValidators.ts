import { v } from "convex/values";

export const assessmentFieldKeyValidator = v.union(
  v.literal("name"),
  v.literal("company"),
  v.literal("role"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("businessContext"),
  v.literal("candidateProcesses"),
  v.literal("priorityProcess"),
  v.literal("trigger"),
  v.literal("outcome"),
  v.literal("owners"),
  v.literal("tools"),
  v.literal("steps"),
  v.literal("exceptions"),
  v.literal("volume"),
  v.literal("manualWork"),
  v.literal("pain"),
  v.literal("impact"),
  v.literal("desiredOutcome"),
  v.literal("successMetric"),
  v.literal("constraints"),
  v.literal("validators"),
);

export const evidenceStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("estimated"),
  v.literal("inferred"),
  v.literal("pending"),
);

export const assessmentEvidenceValidator = v.object({
  field: assessmentFieldKeyValidator,
  value: v.string(),
  evidence: v.string(),
  status: evidenceStatusValidator,
  confidence: v.number(),
  confirmedAt: v.optional(v.number()),
});

export const assessmentAlertValidator = v.object({
  code: v.union(
    v.literal("sensitive-data-redacted"),
    v.literal("contradiction"),
    v.literal("invalid-contact"),
  ),
  field: v.optional(assessmentFieldKeyValidator),
  message: v.string(),
  occurredAt: v.number(),
});

const evidenceFieldsValidator = v.object({
  name: v.optional(assessmentEvidenceValidator),
  company: v.optional(assessmentEvidenceValidator),
  role: v.optional(assessmentEvidenceValidator),
  email: v.optional(assessmentEvidenceValidator),
  phone: v.optional(assessmentEvidenceValidator),
  businessContext: v.optional(assessmentEvidenceValidator),
  candidateProcesses: v.optional(assessmentEvidenceValidator),
  priorityProcess: v.optional(assessmentEvidenceValidator),
  trigger: v.optional(assessmentEvidenceValidator),
  outcome: v.optional(assessmentEvidenceValidator),
  owners: v.optional(assessmentEvidenceValidator),
  tools: v.optional(assessmentEvidenceValidator),
  steps: v.optional(assessmentEvidenceValidator),
  exceptions: v.optional(assessmentEvidenceValidator),
  volume: v.optional(assessmentEvidenceValidator),
  manualWork: v.optional(assessmentEvidenceValidator),
  pain: v.optional(assessmentEvidenceValidator),
  impact: v.optional(assessmentEvidenceValidator),
  desiredOutcome: v.optional(assessmentEvidenceValidator),
  successMetric: v.optional(assessmentEvidenceValidator),
  constraints: v.optional(assessmentEvidenceValidator),
  validators: v.optional(assessmentEvidenceValidator),
});

const probeCountsValidator = v.object({
  name: v.optional(v.number()),
  company: v.optional(v.number()),
  role: v.optional(v.number()),
  email: v.optional(v.number()),
  phone: v.optional(v.number()),
  businessContext: v.optional(v.number()),
  candidateProcesses: v.optional(v.number()),
  priorityProcess: v.optional(v.number()),
  trigger: v.optional(v.number()),
  outcome: v.optional(v.number()),
  owners: v.optional(v.number()),
  tools: v.optional(v.number()),
  steps: v.optional(v.number()),
  exceptions: v.optional(v.number()),
  volume: v.optional(v.number()),
  manualWork: v.optional(v.number()),
  pain: v.optional(v.number()),
  impact: v.optional(v.number()),
  desiredOutcome: v.optional(v.number()),
  successMetric: v.optional(v.number()),
  constraints: v.optional(v.number()),
  validators: v.optional(v.number()),
});

export const assessmentSnapshotValidator = v.object({
  version: v.literal(1),
  revision: v.number(),
  locale: v.union(v.literal("es"), v.literal("en")),
  stage: v.union(
    v.literal("identity"),
    v.literal("context"),
    v.literal("process"),
    v.literal("workflow"),
    v.literal("impact"),
    v.literal("outcome"),
    v.literal("confirmation"),
    v.literal("complete"),
  ),
  fields: evidenceFieldsValidator,
  probeCounts: probeCountsValidator,
  coverageScore: v.number(),
  essentialMissing: v.array(assessmentFieldKeyValidator),
  currentBranch: v.string(),
  elapsedSeconds: v.number(),
  complete: v.boolean(),
  alerts: v.array(assessmentAlertValidator),
  lastUpdatedAt: v.number(),
});

export const progressInputValidator = v.object({
  assessmentId: v.string(),
  eventId: v.string(),
  reason: v.union(
    v.literal("answer"),
    v.literal("correction"),
    v.literal("time-threshold"),
    v.literal("interruption"),
    v.literal("close"),
  ),
  elapsedSeconds: v.number(),
  updates: v.optional(v.array(assessmentEvidenceValidator)),
});

export const progressOutputValidator = v.object({
  snapshot: assessmentSnapshotValidator,
  coverageScore: v.number(),
  essentialMissing: v.array(assessmentFieldKeyValidator),
  currentBranch: v.string(),
  nextInstruction: v.string(),
  suggestedAction: v.union(
    v.literal("continue"),
    v.literal("summarize"),
    v.literal("confirm-contact"),
    v.literal("finish"),
  ),
});

export const reportOpportunityValidator = v.object({
  title: v.string(),
  rationale: v.string(),
  impact: v.string(),
  confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
});

export const assessmentReportValidator = v.object({
  subject: v.string(),
  executiveSummary: v.string(),
  processSummary: v.string(),
  opportunities: v.array(reportOpportunityValidator),
  assumptions: v.array(v.string()),
  openQuestions: v.array(v.string()),
  nextStep: v.string(),
});
