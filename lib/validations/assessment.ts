import { z } from "zod";

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
  assessmentId: z.string().min(1).max(120),
  email: z.string().email().max(160),
  locale: z.enum(["es", "en"]),
  transcript: z.string().max(50000),
  provider: z.enum(["ultravox", "livekit", "demo"]),
  durationSeconds: z.number().int().min(0).max(1200),
});

export type AssessmentIntake = z.infer<typeof assessmentIntakeSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
