import { z } from "zod";
import { voiceProviderIds } from "@/lib/assessment/types";

const phone = z
  .string()
  .min(8)
  .max(24)
  .regex(
    /^\+[1-9]\d{7,14}$/,
    "Usa formato internacional, por ejemplo +18095551234",
  );

export const assessmentIntakeSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(80),
  locale: z.enum(["es", "en"]),
  email: z.string().trim().email().max(160),
  phone,
  processingConsent: z.literal(true),
  recordingConsent: z.literal(true),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().optional(),
});

export const assessmentConferenceStartSchema = z.object({
  locale: z.enum(["es", "en"]),
  processingConsent: z.literal(true),
  recordingConsent: z.literal(true),
  turnstileToken: z.string().optional(),
  providerOverrideToken: z.string().optional(),
  resumeToken: z.string().optional(),
});

const assessmentFieldKeys = ["name", "company", "role", "email", "phone", "businessContext", "candidateProcesses", "priorityProcess", "trigger", "outcome", "owners", "tools", "steps", "exceptions", "volume", "manualWork", "pain", "impact", "desiredOutcome", "successMetric", "constraints", "validators"] as const;

export const assessmentProgressSchema = z.object({
  assessmentId: z.string().uuid(),
  eventId: z.string().uuid(),
  sessionKey: z.string().uuid().optional(),
  locale: z.enum(["es", "en"]).optional(),
  reason: z.enum(["answer", "correction", "time-threshold", "interruption", "close"]),
  elapsedSeconds: z.number().int().min(0).max(900),
  updates: z.array(z.object({ field: z.enum(assessmentFieldKeys), value: z.string().trim().min(1).max(2000), evidence: z.string().trim().min(1).max(4000), status: z.enum(["confirmed", "estimated", "inferred", "pending"]), confidence: z.number().min(0).max(1) })).max(30).optional(),
});

export const voiceProviderSchema = z.enum(voiceProviderIds);

export const assessmentReportSchema = z.object({ subject: z.string().trim().min(5).max(180), executiveSummary: z.string().trim().min(20).max(5000), processSummary: z.string().trim().min(20).max(10000), opportunities: z.array(z.object({ title: z.string().min(3).max(180), rationale: z.string().min(10).max(3000), impact: z.string().max(1000), confidence: z.enum(["high", "medium", "low"]) })).min(1).max(5), assumptions: z.array(z.string().max(1000)).max(20), openQuestions: z.array(z.string().max(1000)).max(20), nextStep: z.string().min(10).max(3000) });

export const assessmentReviewSchema = z.object({
  assessmentId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  action: z.enum(["save", "approve-and-send"]),
  report: assessmentReportSchema,
});

export const bookingSchema = assessmentIntakeSchema
  .omit({ recordingConsent: true })
  .extend({
    recordingConsent: z.boolean(),
    start: z.string().datetime(),
    timezone: z.string().min(2).max(80),
    channel: z.enum(["web", "phone"]),
    bookingAttemptId: z.string().uuid().optional(),
  });

export const assessmentCompleteSchema = z.object({
  assessmentId: z.string().uuid(),
  sessionKey: z.string().uuid(),
  email: z.string().email().max(160).optional(),
  locale: z.enum(["es", "en"]),
  transcript: z.string().max(50000),
  provider: z.enum(["ultravox", "livekit", "gemini-live", "demo"]),
  durationSeconds: z.number().int().min(0).max(1200),
});

export type AssessmentIntake = z.infer<typeof assessmentIntakeSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
