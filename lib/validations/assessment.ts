import { z } from "zod";
import { voiceProviderIds } from "@/lib/assessment/types";
import { isValidTimeZone } from "@/lib/scheduling/timezone";

const phone = z
  .string()
  .min(8)
  .max(24)
  .regex(/^\+[1-9]\d{7,14}$/, "Usa formato internacional, por ejemplo +18095551234");

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

const assessmentFieldKeys = [
  "name",
  "company",
  "role",
  "email",
  "phone",
  "businessContext",
  "candidateProcesses",
  "priorityProcess",
  "trigger",
  "outcome",
  "owners",
  "tools",
  "steps",
  "exceptions",
  "volume",
  "manualWork",
  "pain",
  "impact",
  "desiredOutcome",
  "successMetric",
  "constraints",
  "validators",
] as const;

export const assessmentProgressSchema = z.object({
  assessmentId: z.string().uuid(),
  eventId: z.string().uuid(),
  sessionKey: z.string().uuid().optional(),
  locale: z.enum(["es", "en"]).optional(),
  reason: z.enum(["answer", "correction", "time-threshold", "interruption", "close"]),
  elapsedSeconds: z.number().int().min(0).max(900),
  updates: z
    .array(
      z.object({
        field: z.enum(assessmentFieldKeys),
        value: z.string().trim().min(1).max(2000),
        evidence: z.string().trim().min(1).max(4000),
        status: z.enum(["confirmed", "estimated", "inferred", "pending"]),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(30)
    .optional(),
});

export const voiceProviderSchema = z.enum(voiceProviderIds);

export const assessmentReportSchema = z.object({
  subject: z.string().trim().min(5).max(180),
  executiveSummary: z.string().trim().min(20).max(5000),
  processSummary: z.string().trim().min(20).max(10000),
  opportunities: z
    .array(
      z.object({
        title: z.string().min(3).max(180),
        rationale: z.string().min(10).max(3000),
        impact: z.string().max(1000),
        confidence: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1)
    .max(5),
  assumptions: z.array(z.string().max(1000)).max(20),
  openQuestions: z.array(z.string().max(1000)).max(20),
  nextStep: z.string().min(10).max(3000),
});

export const assessmentReviewSchema = z.object({
  assessmentId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  action: z.enum(["save", "approve-and-send"]),
  report: assessmentReportSchema,
});

export const bookingSchema = z.object({
  firstName: z
    .string({ error: "El nombre es obligatorio." })
    .trim()
    .min(2, "Escribe un nombre válido.")
    .max(60),
  lastName: z
    .string({ error: "El apellido es obligatorio." })
    .trim()
    .min(2, "Escribe un apellido válido.")
    .max(80),
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(100).optional(),
  country: z.string({ error: "El país es obligatorio." }).trim().min(2).max(80),
  locale: z.enum(["es", "en"]),
  email: z
    .string({ error: "El correo es obligatorio." })
    .trim()
    .email("Escribe un correo válido.")
    .max(160),
  phone,
  notes: z.string().trim().max(1000).optional(),
  processingConsent: z.literal(true, { error: "Debes aceptar el procesamiento de datos." }),
  recordingConsent: z.boolean(),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().optional(),
  start: z.string().datetime({ message: "El horario seleccionado no es válido." }),
  timezone: z
    .string()
    .min(1)
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
        return true;
      } catch {
        return false;
      }
    }, "La zona horaria no es válida."),
  channel: z.enum(["web", "phone"]),
  bookingAttemptId: z.string().uuid().optional(),
});

const civilDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}, "La fecha no es válida.");

const localTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "La hora no es válida.");

export const agendaRulesSchema = z
  .object({
    timezone: z.string().trim().max(80).refine(isValidTimeZone, "La zona horaria no es válida."),
    durationMinutes: z.number().int().min(5).max(480),
    bufferMinutes: z.number().int().min(0).max(1440),
    minimumNoticeHours: z.number().int().min(0).max(8760),
    horizonDays: z.number().int().min(1).max(365),
    weekly: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          enabled: z.boolean(),
          start: localTimeSchema,
          end: localTimeSchema,
        }),
      )
      .min(1)
      .max(7),
  })
  .superRefine((value, context) => {
    const seen = new Set<number>();
    for (const [index, rule] of value.weekly.entries()) {
      if (seen.has(rule.weekday))
        context.addIssue({
          code: "custom",
          path: ["weekly", index, "weekday"],
          message: "El día está repetido.",
        });
      seen.add(rule.weekday);
      if (rule.start >= rule.end)
        context.addIssue({
          code: "custom",
          path: ["weekly", index, "end"],
          message: "La hora final debe ser posterior a la inicial.",
        });
    }
  });

export const agendaExceptionSchema = z
  .object({
    date: civilDateSchema,
    available: z.boolean(),
    start: localTimeSchema.optional(),
    end: localTimeSchema.optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if ((value.start === undefined) !== (value.end === undefined))
      context.addIssue({
        code: "custom",
        path: [value.start === undefined ? "start" : "end"],
        message: "Debes indicar ambas horas.",
      });
    if (value.start !== undefined && value.end !== undefined && value.start >= value.end)
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "La hora final debe ser posterior a la inicial.",
      });
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
